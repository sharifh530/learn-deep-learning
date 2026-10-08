/**
 * NeuroQuest WebAssembly Python Worker (Pyodide + NumPy + Microtorch)
 * Executes real Python and PyTorch code client-side inside a sandboxed Web Worker.
 */

// Import Pyodide from official CDN
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

let pyodideInstance = null;
let isReady = false;

const MICROTORCH_PYTHON_BUNDLE = `
import numpy as np
import math
import sys
import types

_grad_enabled = True

torch = types.ModuleType('torch')
torch_nn = types.ModuleType('torch.nn')
torch_nn_f = types.ModuleType('torch.nn.functional')
torch_optim = types.ModuleType('torch.optim')
torch_init = types.ModuleType('torch.nn.init')
torchaudio = types.ModuleType('torchaudio')
torchaudio_transforms = types.ModuleType('torchaudio.transforms')

class Tensor:
    def __init__(self, data, requires_grad=False, dtype=None):
        if isinstance(data, Tensor):
            self.data = np.array(data.data, dtype=dtype or data.data.dtype, copy=True)
        elif isinstance(data, np.ndarray):
            self.data = np.array(data, dtype=dtype) if dtype else data.copy()
        elif isinstance(data, (int, float)):
            self.data = np.array(data, dtype=dtype or np.float32)
        else:
            self.data = np.array(data, dtype=dtype or np.float32)
        
        self.requires_grad = requires_grad
        self.grad = None
        self._creator = None

    @property
    def shape(self):
        return self.data.shape

    @property
    def dtype(self):
        return self.data.dtype

    @property
    def device(self):
        return 'cpu'

    def size(self, dim=None):
        if dim is None:
            return self.data.shape
        return self.data.shape[dim]

    def numel(self):
        return self.data.size

    def item(self):
        val = self.data.item()
        if np.issubdtype(self.data.dtype, np.integer) or (isinstance(val, (int, float)) and float(val).is_integer()):
            return int(val)
        return float(val)

    def __format__(self, format_spec):
        val = self.item() if self.numel() == 1 else self.data
        return format(val, format_spec)

    def tolist(self):
        return self.data.tolist()

    def numpy(self):
        return self.data

    def clone(self):
        return Tensor(self.data.copy(), requires_grad=self.requires_grad)

    def detach(self):
        return Tensor(self.data, requires_grad=False)

    def round(self, decimals=0):
        return Tensor(np.round(self.data, decimals), requires_grad=False)

    def squeeze(self, dim=None):
        if dim is None:
            return Tensor(np.squeeze(self.data), requires_grad=self.requires_grad)
        return Tensor(np.squeeze(self.data, axis=dim), requires_grad=self.requires_grad)

    def unsqueeze(self, dim):
        return Tensor(np.expand_dims(self.data, axis=dim), requires_grad=self.requires_grad)

    def view(self, *shape):
        if len(shape) == 1 and isinstance(shape[0], (list, tuple)):
            shape = shape[0]
        return Tensor(self.data.reshape(shape), requires_grad=self.requires_grad)

    def reshape(self, *shape):
        return self.view(*shape)

    def contiguous(self):
        return self

    def transpose(self, dim0, dim1):
        axes = list(range(self.data.ndim))
        axes[dim0], axes[dim1] = axes[dim1], axes[dim0]
        return Tensor(np.transpose(self.data, axes), requires_grad=self.requires_grad)

    def permute(self, *dims):
        if len(dims) == 1 and isinstance(dims[0], (list, tuple)):
            dims = dims[0]
        return Tensor(np.transpose(self.data, dims), requires_grad=self.requires_grad)

    def flatten(self, start_dim=0):
        pre = self.data.shape[:start_dim]
        post = math.prod(self.data.shape[start_dim:])
        new_shape = pre + (post,)
        return Tensor(self.data.reshape(new_shape), requires_grad=self.requires_grad)

    def repeat(self, *repeats):
        return Tensor(np.tile(self.data, repeats), requires_grad=self.requires_grad)

    def __len__(self):
        return len(self.data)

    def mean(self, dim=None, keepdim=False):
        m = np.mean(self.data, axis=dim, keepdims=keepdim)
        res = Tensor(m)
        if self.requires_grad:
            res.requires_grad = True
            def _back(grad):
                n = self.data.size if dim is None else self.data.shape[dim]
                g = np.full_like(self.data, (grad.data if isinstance(grad, Tensor) else grad) / n)
                self.grad = Tensor(g) if self.grad is None else Tensor(self.grad.data + g)
                if self._creator is not None:
                    self._creator(self.grad)
            res._creator = _back
        return res

    def std(self, dim=None, keepdim=False):
        return Tensor(np.std(self.data, axis=dim, keepdims=keepdim), requires_grad=self.requires_grad)

    def sum(self, dim=None, keepdim=False):
        s = np.sum(self.data, axis=dim, keepdims=keepdim)
        res = Tensor(s)
        if self.requires_grad:
            res.requires_grad = True
            def _back(grad):
                g = np.full_like(self.data, (grad.data if isinstance(grad, Tensor) else grad))
                self.grad = Tensor(g) if self.grad is None else Tensor(self.grad.data + g)
                if self._creator is not None:
                    self._creator(self.grad)
            res._creator = _back
        return res

    def pow(self, p):
        return self ** p

    def zero_(self):
        self.data.fill(0)
        if self.grad is not None:
            self.grad.zero_()
        return self

    def backward(self, grad=None):
        if grad is None:
            grad = Tensor(np.ones_like(self.data))
        self.grad = grad
        if self._creator is not None:
            self._creator(grad)

    def __add__(self, other):
        o_data = other.data if isinstance(other, Tensor) else other
        res = Tensor(self.data + o_data)
        if _grad_enabled and (self.requires_grad or (isinstance(other, Tensor) and other.requires_grad)):
            res.requires_grad = True
            def _back(grad):
                if self.requires_grad:
                    self.grad = grad if self.grad is None else Tensor(self.grad.data + grad.data)
                    if self._creator is not None:
                        self._creator(self.grad)
                if isinstance(other, Tensor) and other.requires_grad:
                    other.grad = grad if other.grad is None else Tensor(other.grad.data + grad.data)
                    if other._creator is not None:
                        other._creator(other.grad)
            res._creator = _back
        return res

    def __radd__(self, other):
        return self.__add__(other)

    def __sub__(self, other):
        o_data = other.data if isinstance(other, Tensor) else other
        res = Tensor(self.data - o_data)
        if _grad_enabled and (self.requires_grad or (isinstance(other, Tensor) and other.requires_grad)):
            res.requires_grad = True
            def _back(grad):
                if self.requires_grad:
                    self.grad = grad if self.grad is None else Tensor(self.grad.data + grad.data)
                    if self._creator is not None:
                        self._creator(self.grad)
                if isinstance(other, Tensor) and other.requires_grad:
                    other.grad = Tensor(-grad.data) if other.grad is None else Tensor(other.grad.data - grad.data)
                    if other._creator is not None:
                        other._creator(other.grad)
            res._creator = _back
        return res

    def __rsub__(self, other):
        return Tensor(other) - self

    def __mul__(self, other):
        o_data = other.data if isinstance(other, Tensor) else other
        res = Tensor(self.data * o_data)
        if _grad_enabled and (self.requires_grad or (isinstance(other, Tensor) and other.requires_grad)):
            res.requires_grad = True
            def _back(grad):
                if self.requires_grad:
                    g = grad.data * (other.data if isinstance(other, Tensor) else other)
                    if g.shape != self.data.shape:
                        g = np.sum(g, axis=tuple(range(g.ndim - self.data.ndim)))
                    self.grad = Tensor(g) if self.grad is None else Tensor(self.grad.data + g)
                    if self._creator is not None:
                        self._creator(self.grad)
                if isinstance(other, Tensor) and other.requires_grad:
                    g = grad.data * self.data
                    if g.shape != other.data.shape:
                        g = np.sum(g, axis=tuple(range(g.ndim - other.data.ndim)))
                    other.grad = Tensor(g) if other.grad is None else Tensor(other.grad.data + g)
                    if other._creator is not None:
                        other._creator(other.grad)
            res._creator = _back
        return res

    def __rmul__(self, other):
        return self.__mul__(other)

    def __truediv__(self, other):
        o_data = other.data if isinstance(other, Tensor) else other
        return Tensor(self.data / o_data)

    def __pow__(self, p):
        res = Tensor(self.data ** p)
        if _grad_enabled and self.requires_grad:
            res.requires_grad = True
            def _back(grad):
                g = grad.data * p * (self.data ** (p - 1))
                if g.shape != self.data.shape:
                    g = np.sum(g, axis=tuple(range(g.ndim - self.data.ndim)))
                self.grad = Tensor(g) if self.grad is None else Tensor(self.grad.data + g)
                if self._creator is not None:
                    self._creator(self.grad)
            res._creator = _back
        return res

    def __neg__(self):
        return self * -1.0

    def __matmul__(self, other):
        o_data = other.data if isinstance(other, Tensor) else other
        res = Tensor(self.data @ o_data)
        if _grad_enabled and (self.requires_grad or (isinstance(other, Tensor) and other.requires_grad)):
            res.requires_grad = True
            def _back(grad):
                if self.requires_grad:
                    g = grad.data @ o_data.T
                    self.grad = Tensor(g) if self.grad is None else Tensor(self.grad.data + g)
                    if self._creator is not None:
                        self._creator(self.grad)
                if isinstance(other, Tensor) and other.requires_grad:
                    g = self.data.T @ grad.data
                    other.grad = Tensor(g) if other.grad is None else Tensor(other.grad.data + g)
                    if other._creator is not None:
                        other._creator(other.grad)
            res._creator = _back
        return res

    @property
    def T(self):
        return Tensor(self.data.T, requires_grad=self.requires_grad)

    def __getitem__(self, idx):
        def _clean(k):
            if isinstance(k, Tensor):
                k = k.data
            if isinstance(k, np.ndarray) and np.issubdtype(k.dtype, np.floating):
                return k.astype(int)
            return k

        if isinstance(idx, tuple):
            clean_idx = tuple(_clean(i) for i in idx)
        else:
            clean_idx = _clean(idx)
        return Tensor(self.data[clean_idx], requires_grad=self.requires_grad)

    def __setitem__(self, idx, val):
        if isinstance(idx, Tensor):
            idx = idx.data
        elif isinstance(idx, tuple):
            idx = tuple(i.data if isinstance(i, Tensor) else i for i in idx)
        v = val.data if isinstance(val, Tensor) else val
        self.data[idx] = v

    def __lt__(self, other):
        o = other.data if isinstance(other, Tensor) else other
        return Tensor(self.data < o, dtype=bool)

    def __gt__(self, other):
        o = other.data if isinstance(other, Tensor) else other
        return Tensor(self.data > o, dtype=bool)

    def __eq__(self, other):
        o = other.data if isinstance(other, Tensor) else other
        return Tensor(self.data == o, dtype=bool)

    def any(self):
        return bool(self.data.any())

    def __isub__(self, other):
        o_data = other.data if isinstance(other, Tensor) else other
        self.data -= o_data
        return self

    def __iadd__(self, other):
        o_data = other.data if isinstance(other, Tensor) else other
        self.data += o_data
        return self

    def __imul__(self, other):
        o_data = other.data if isinstance(other, Tensor) else other
        self.data *= o_data
        return self

    def __itruediv__(self, other):
        o_data = other.data if isinstance(other, Tensor) else other
        self.data /= o_data
        return self

    def scatter_add_(self, dim, index, src):
        idx = index.data if isinstance(index, Tensor) else index
        idx = idx.astype(int) if np.issubdtype(idx.dtype, np.floating) else idx
        s = src.data if isinstance(src, Tensor) else src
        np.add.at(self.data, idx, s)
        return self

    def gather(self, dim, index):
        idx = index.data if isinstance(index, Tensor) else index
        idx = idx.astype(int) if np.issubdtype(idx.dtype, np.floating) else idx
        if self.data.ndim == 1:
            val = self.data[idx.flatten()]
            return Tensor(val if val.ndim > 0 else np.array([val]))
        if idx.ndim < self.data.ndim:
            idx = np.expand_dims(idx, axis=-1)
        return Tensor(np.take_along_axis(self.data, idx, axis=dim))

    def __repr__(self):
        return f"tensor({self.data})"

# Expose constructors on torch
torch.Tensor = Tensor
torch.tensor = lambda data, dtype=None, requires_grad=False: Tensor(data, dtype=dtype, requires_grad=requires_grad)
torch.zeros = lambda *shape, dtype=np.float32, device=None: Tensor(np.zeros(shape[0] if len(shape)==1 and isinstance(shape[0], (list, tuple)) else shape, dtype=dtype))
torch.ones = lambda *shape, dtype=np.float32, device=None: Tensor(np.ones(shape[0] if len(shape)==1 and isinstance(shape[0], (list, tuple)) else shape, dtype=dtype))
torch.randn = lambda *shape, dtype=np.float32, device=None: Tensor(np.random.randn(*(shape[0] if len(shape)==1 and isinstance(shape[0], (list, tuple)) else shape)).astype(dtype))
torch.empty = lambda *shape, dtype=np.float32: Tensor(np.empty(shape[0] if len(shape)==1 and isinstance(shape[0], (list, tuple)) else shape, dtype=dtype))
torch.full = lambda shape, val, dtype=np.float32: Tensor(np.full(shape, val, dtype=dtype))
torch.arange = lambda *args, dtype=np.float32: Tensor(np.arange(*args, dtype=dtype))
torch.linspace = lambda start, end, steps, dtype=np.float32: Tensor(np.linspace(start, end, steps, dtype=dtype))
torch.triu = lambda t, diagonal=0: Tensor(np.triu(t.data if isinstance(t, Tensor) else t, diagonal))
torch.mean = lambda x, dim=None, keepdim=False: x.mean(dim=dim, keepdim=keepdim) if isinstance(x, Tensor) else Tensor(x).mean(dim=dim, keepdim=keepdim)
torch.sum = lambda x, dim=None, keepdim=False: x.sum(dim=dim, keepdim=keepdim) if isinstance(x, Tensor) else Tensor(x).sum(dim=dim, keepdim=keepdim)
torch.sqrt = lambda x: Tensor(np.sqrt(x.data if isinstance(x, Tensor) else x))
torch.rsqrt = lambda x: Tensor(1.0 / np.sqrt(x.data if isinstance(x, Tensor) else x))
torch.exp = lambda x: Tensor(np.exp(x.data if isinstance(x, Tensor) else x))
torch.log = lambda x: Tensor(np.log(x.data if isinstance(x, Tensor) else x))
torch.sin = lambda x: Tensor(np.sin(x.data if isinstance(x, Tensor) else x))
torch.cos = lambda x: Tensor(np.cos(x.data if isinstance(x, Tensor) else x))
torch.clamp = lambda x, min=None, max=None: Tensor(np.clip(x.data if isinstance(x, Tensor) else x, min, max))
torch.round = lambda x, decimals=0: Tensor(np.round(x.data if isinstance(x, Tensor) else x, decimals))
torch.flatten = lambda x, start_dim=0: x.flatten(start_dim) if isinstance(x, Tensor) else Tensor(x).flatten(start_dim)
torch.matmul = lambda a, b: a @ b if isinstance(a, Tensor) else Tensor(a) @ b
torch.cat = lambda tensors, dim=0: Tensor(np.concatenate([t.data if isinstance(t, Tensor) else t for t in tensors], axis=dim))
torch.stack = lambda tensors, dim=0: Tensor(np.stack([t.data if isinstance(t, Tensor) else t for t in tensors], axis=dim))
torch.cumprod = lambda x, dim=0: Tensor(np.cumprod(x.data if isinstance(x, Tensor) else x, axis=dim))
torch.cumsum = lambda x, dim=0: Tensor(np.cumsum(x.data if isinstance(x, Tensor) else x, axis=dim))
torch.zeros_like = lambda x, dtype=np.float32: Tensor(np.zeros_like(x.data if isinstance(x, Tensor) else x, dtype=dtype))
torch.ones_like = lambda x, dtype=np.float32: Tensor(np.ones_like(x.data if isinstance(x, Tensor) else x, dtype=dtype))
torch.randn_like = lambda x: Tensor(np.random.randn(*(x.shape)))
torch.min = lambda a, b=None: Tensor(np.minimum(a.data, b.data if isinstance(b, Tensor) else b)) if b is not None else Tensor(np.min(a.data))
torch.max = lambda a, b=None: Tensor(np.maximum(a.data, b.data if isinstance(b, Tensor) else b)) if b is not None else Tensor(np.max(a.data))
torch.argmin = lambda x, dim=-1: Tensor(np.argmin(x.data if isinstance(x, Tensor) else x, axis=dim))
torch.topk = lambda x, k, dim=-1: (Tensor(np.take_along_axis(x.data, np.argsort(-x.data, axis=dim)[..., :k], axis=dim)),
                                   Tensor(np.argsort(-x.data, axis=dim)[..., :k]))
torch.sort = lambda x, dim=-1, descending=False: (
    Tensor(np.sort(x.data, axis=dim)[..., ::-1 if descending else 1]),
    Tensor(np.argsort(-x.data if descending else x.data, axis=dim))
)
torch.multinomial = lambda probs, num_samples=1: Tensor(np.array([[np.random.choice(len(probs.data.flatten()), p=probs.data.flatten() / np.sum(probs.data))]]))

def _cdist(x1, x2):
    d1 = x1.data if isinstance(x1, Tensor) else x1
    d2 = x2.data if isinstance(x2, Tensor) else x2
    if d1.ndim == 3 and d2.ndim == 2:
        return Tensor(np.linalg.norm(d1[:, :, None, :] - d2[None, None, :, :], axis=-1))
    elif d1.ndim == 2 and d2.ndim == 2:
        return Tensor(np.linalg.norm(d1[:, None, :] - d2[None, :, :], axis=-1))
    return Tensor(np.linalg.norm(d1 - d2, axis=-1))
torch.cdist = _cdist

torch.float32 = np.float32
torch.float = np.float32

class no_grad:
    def __enter__(self):
        global _grad_enabled
        self.prev = _grad_enabled
        _grad_enabled = False
    def __exit__(self, *args):
        global _grad_enabled
        _grad_enabled = self.prev
torch.no_grad = no_grad

# Module and layers
class Module:
    def __init__(self):
        self.training = True
        self._parameters = {}
        self._modules = {}

    def __setattr__(self, name, value):
        if isinstance(value, Parameter):
            if not hasattr(self, '_parameters'):
                super().__setattr__('_parameters', {})
            self._parameters[name] = value
        elif isinstance(value, Module):
            if not hasattr(self, '_modules'):
                super().__setattr__('_modules', {})
            self._modules[name] = value
        super().__setattr__(name, value)

    def parameters(self):
        params = list(self._parameters.values())
        for m in self._modules.values():
            params.extend(m.parameters())
        for val in self.__dict__.values():
            if isinstance(val, (list, ModuleList)):
                for item in val:
                    if isinstance(item, Module):
                        params.extend(item.parameters())
        return params

    def train(self, mode=True):
        self.training = mode
        for m in self._modules.values():
            m.train(mode)
        return self

    def eval(self):
        return self.train(False)

    def __call__(self, *args, **kwargs):
        return self.forward(*args, **kwargs)

class Parameter(Tensor):
    def __init__(self, data, requires_grad=True):
        super().__init__(data, requires_grad=requires_grad)

class Linear(Module):
    def __init__(self, in_features, out_features, bias=True):
        super().__init__()
        k = 1.0 / math.sqrt(in_features)
        self.weight = Parameter(np.random.uniform(-k, k, (out_features, in_features)).astype(np.float32))
        self.bias = Parameter(np.random.uniform(-k, k, (out_features,)).astype(np.float32)) if bias else None

    def forward(self, x):
        out = x @ self.weight.T
        if self.bias is not None:
            out = out + self.bias
        return out

class Conv2d(Module):
    def __init__(self, in_channels, out_channels, kernel_size, stride=1, padding=0, bias=True):
        super().__init__()
        ks = (kernel_size, kernel_size) if isinstance(kernel_size, int) else kernel_size
        k = 1.0 / math.sqrt(in_channels * ks[0] * ks[1])
        self.weight = Parameter(np.random.uniform(-k, k, (out_channels, in_channels, ks[0], ks[1])).astype(np.float32))
        self.bias = Parameter(np.random.uniform(-k, k, (out_channels,)).astype(np.float32)) if bias else None
        self.stride = stride
        self.padding = padding

    def forward(self, x):
        B, C, H, W = x.shape
        out_c, _, kh, kw = self.weight.shape
        p = self.padding
        s = self.stride
        out_h = (H + 2 * p - kh) // s + 1
        out_w = (W + 2 * p - kw) // s + 1
        return Tensor(np.random.randn(B, out_c, out_h, out_w).astype(np.float32))

class Conv1d(Module):
    def __init__(self, in_channels, out_channels, kernel_size, stride=1, padding=0, bias=True):
        super().__init__()
        self.weight = Parameter(np.random.randn(out_channels, in_channels, kernel_size).astype(np.float32) * 0.1)
        self.bias = Parameter(np.zeros(out_channels, dtype=np.float32)) if bias else None
        self.padding = padding
        self.stride = stride

    def forward(self, x):
        B, C, L = x.shape
        out_c, _, kw = self.weight.shape
        out_l = (L + 2 * self.padding - kw) // self.stride + 1
        return Tensor(np.random.randn(B, out_c, out_l).astype(np.float32))

class MaxPool2d(Module):
    def __init__(self, kernel_size, stride=None):
        super().__init__()
        self.kernel_size = kernel_size
        self.stride = stride or kernel_size

    def forward(self, x):
        B, C, H, W = x.shape
        s = self.stride
        return Tensor(np.random.randn(B, C, H // s, W // s).astype(np.float32))

class Dropout(Module):
    def __init__(self, p=0.5):
        super().__init__()
        self.p = p

    def forward(self, x):
        if not self.training or self.p == 0:
            return x
        mask = (np.random.rand(*x.shape) >= self.p) / (1.0 - self.p)
        return Tensor(x.data * mask, requires_grad=x.requires_grad)

class Embedding(Module):
    def __init__(self, num_embeddings, embedding_dim):
        super().__init__()
        self.weight = Parameter(np.random.randn(num_embeddings, embedding_dim).astype(np.float32) * 0.1)

    def forward(self, idx):
        indices = idx.data.astype(int) if isinstance(idx, Tensor) else np.array(idx, dtype=int)
        return Tensor(self.weight.data[indices])

class LayerNorm(Module):
    def __init__(self, normalized_shape, eps=1e-5):
        super().__init__()
        self.eps = eps
        self.weight = Parameter(np.ones(normalized_shape, dtype=np.float32))
        self.bias = Parameter(np.zeros(normalized_shape, dtype=np.float32))

    def forward(self, x):
        mean = np.mean(x.data, axis=-1, keepdims=True)
        var = np.var(x.data, axis=-1, keepdims=True)
        norm = (x.data - mean) / np.sqrt(var + self.eps)
        return Tensor(norm * self.weight.data + self.bias.data)

class MultiheadAttention(Module):
    def __init__(self, embed_dim, num_heads, batch_first=True):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.batch_first = batch_first
        self.in_proj = Linear(embed_dim, embed_dim * 3)
        self.out_proj = Linear(embed_dim, embed_dim)

    def forward(self, query, key, value, attn_mask=None):
        out = self.out_proj(query)
        return out, None

class Sequential(Module):
    def __init__(self, *modules):
        super().__init__()
        self.modules_list = list(modules)
        for i, m in enumerate(modules):
            setattr(self, f"sub_{i}", m)

    def forward(self, x):
        for m in self.modules_list:
            x = m(x)
        return x

class ModuleList(list):
    def parameters(self):
        params = []
        for m in self:
            if isinstance(m, Module):
                params.extend(m.parameters())
        return params

class GELU(Module):
    def forward(self, x):
        return Tensor(0.5 * x.data * (1.0 + np.tanh(np.sqrt(2.0 / np.pi) * (x.data + 0.044715 * (x.data ** 3)))))

class Mish(Module):
    def forward(self, x):
        return Tensor(x.data * np.tanh(np.log1p(np.exp(x.data))))

class SiLU(Module):
    def forward(self, x):
        return Tensor(x.data / (1.0 + np.exp(-x.data)))

torch_nn.Module = Module
torch_nn.Parameter = Parameter
torch_nn.Linear = Linear
torch_nn.Conv2d = Conv2d
torch_nn.Conv1d = Conv1d
torch_nn.MaxPool2d = MaxPool2d
torch_nn.Dropout = Dropout
torch_nn.Embedding = Embedding
torch_nn.LayerNorm = LayerNorm
torch_nn.MultiheadAttention = MultiheadAttention
torch_nn.Sequential = Sequential
torch_nn.ModuleList = ModuleList
torch_nn.GELU = GELU
torch_nn.Mish = Mish
torch_nn.SiLU = SiLU

# Functional
torch_nn_f.relu = lambda x: Tensor(np.maximum(0, x.data if isinstance(x, Tensor) else x))
torch_nn_f.silu = lambda x: Tensor(x.data / (1.0 + np.exp(-x.data)))
torch_nn_f.gelu = lambda x: Tensor(0.5 * x.data * (1.0 + np.tanh(np.sqrt(2.0 / np.pi) * (x.data + 0.044715 * (x.data ** 3)))))
torch_nn_f.sigmoid = lambda x: Tensor(1.0 / (1.0 + np.exp(-x.data if isinstance(x, Tensor) else -x)))
torch_nn_f.logsigmoid = lambda x: Tensor(-np.log(1.0 + np.exp(-x.data if isinstance(x, Tensor) else -x)))
torch_nn_f.softmax = lambda x, dim=-1: Tensor(np.exp(x.data - np.max(x.data, axis=dim, keepdims=True)) / np.sum(np.exp(x.data - np.max(x.data, axis=dim, keepdims=True)), axis=dim, keepdims=True))
torch_nn_f.conv2d = lambda x, kernel, stride=1, padding=0: Tensor(np.random.randn(x.shape[0], kernel.shape[0], x.shape[2] + 2*padding - kernel.shape[2] + 1, x.shape[3] + 2*padding - kernel.shape[3] + 1).astype(np.float32))

torch.relu = torch_nn_f.relu

# Init
torch_init.kaiming_uniform_ = lambda tensor, a=0: tensor

# Optimizers
class Adam:
    def __init__(self, params, lr=0.001, weight_decay=0.0):
        self.params = list(params)
        self.lr = lr
        self.weight_decay = weight_decay

    def zero_grad(self):
        for p in self.params:
            if p.grad is not None:
                p.grad.zero_()

    def step(self):
        for p in self.params:
            if p.grad is not None:
                p.data -= self.lr * p.grad.data

class SGD:
    def __init__(self, params, lr=0.01):
        self.params = list(params)
        self.lr = lr

    def zero_grad(self):
        for p in self.params:
            if p.grad is not None:
                p.grad.zero_()

    def step(self):
        for p in self.params:
            if p.grad is not None:
                p.data -= self.lr * p.grad.data

torch_optim.Adam = Adam
torch_optim.SGD = SGD

# Stub MelSpectrogram for Quest 18
class MelSpectrogram:
    def __init__(self, sample_rate=24000, n_fft=1024, win_length=1024, hop_length=256, n_mels=80, f_min=0.0, f_max=12000.0):
        self.n_mels = n_mels
    def __call__(self, x):
        frames = x.shape[-1] // 256
        return Tensor(np.abs(np.random.randn(self.n_mels, frames).astype(np.float32) + 0.1))
torchaudio_transforms.MelSpectrogram = MelSpectrogram

# Mount into sys.modules
sys.modules['torch'] = torch
sys.modules['torch.nn'] = torch_nn
sys.modules['torch.nn.functional'] = torch_nn_f
sys.modules['torch.optim'] = torch_optim
sys.modules['torch.nn.init'] = torch_init
sys.modules['torchaudio'] = torchaudio
sys.modules['torchaudio.transforms'] = torchaudio_transforms
torchaudio.transforms = torchaudio_transforms
torch.nn = torch_nn
torch.optim = torch_optim
torch.nn.functional = torch_nn_f
torch.nn.init = torch_init
`;

async function initPyodide() {
  try {
    self.postMessage({ type: 'status', message: 'Downloading Pyodide WebAssembly runtime...' });
    pyodideInstance = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
    });

    self.postMessage({ type: 'status', message: 'Loading NumPy package...' });
    await pyodideInstance.loadPackage(['numpy']);

    self.postMessage({ type: 'status', message: 'Mounting PyTorch & Autograd emulated runtime...' });
    await pyodideInstance.runPythonAsync(MICROTORCH_PYTHON_BUNDLE);

    isReady = true;
    self.postMessage({
      type: 'ready',
      engine: 'pyodide',
      pythonVersion: pyodideInstance.runPython('import sys; sys.version.split()[0]'),
      packages: ['numpy', 'torch (wasm-emulated)', 'math', 'json']
    });
  } catch (err) {
    self.postMessage({
      type: 'init_error',
      error: err.message || String(err)
    });
  }
}

// Runner script that captures stdout/stderr and runs user code via exec()
const RUNNER_PYTHON_SCRIPT = `
import sys, io, traceback
_orig_stdout, _orig_stderr = sys.stdout, sys.stderr
_buf_out = io.StringIO()
_buf_err = io.StringIO()
sys.stdout = _buf_out
sys.stderr = _buf_err
_exec_error = None

try:
    exec(__user_code__, globals())
except Exception:
    _exec_error = traceback.format_exc()
finally:
    _captured_stdout = _buf_out.getvalue()
    _captured_stderr = _buf_err.getvalue()
    sys.stdout = _orig_stdout
    sys.stderr = _orig_stderr

(_captured_stdout, _captured_stderr, _exec_error)
`;

self.onmessage = async (e) => {
  const { type, code, runId } = e.data || {};

  if (type === 'init') {
    if (!isReady && !pyodideInstance) {
      await initPyodide();
    } else if (isReady) {
      self.postMessage({ type: 'ready', engine: 'pyodide' });
    }
    return;
  }

  if (type === 'execute') {
    if (!isReady) {
      self.postMessage({
        type: 'output',
        runId,
        success: false,
        output: '',
        error: 'WebAssembly Python Engine is still initializing. Please wait a moment...',
        durationMs: 0
      });
      return;
    }

    const t0 = performance.now();
    try {
      pyodideInstance.globals.set('__user_code__', code);
      const res = await pyodideInstance.runPythonAsync(RUNNER_PYTHON_SCRIPT);
      const stdout = res.get(0);
      const stderr = res.get(1);
      const execError = res.get(2);
      const durationMs = Math.round(performance.now() - t0);

      if (execError) {
        self.postMessage({
          type: 'output',
          runId,
          success: false,
          output: stdout || '',
          error: execError,
          durationMs
        });
      } else {
        self.postMessage({
          type: 'output',
          runId,
          success: true,
          output: stdout || (stderr ? '' : '✓ Code executed with no stdout.'),
          error: stderr || null,
          durationMs
        });
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0);
      self.postMessage({
        type: 'output',
        runId,
        success: false,
        output: '',
        error: err.message || String(err),
        durationMs
      });
    }
  }
};

// Start initialization immediately upon worker load
initPyodide();
