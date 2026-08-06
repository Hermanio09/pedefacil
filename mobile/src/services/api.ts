import axios from "axios";

// Troque pelo endereço do seu servidor em produção
const API_URL = "http://localhost:3001/api";

export const api = axios.create({ baseURL: API_URL });

export type Produto = {
  id: string;
  nome: string;
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueAbaixoMinimo: boolean;
};

export type Movimentacao = {
  id: string;
  produtoId: string;
  tipo: "entrada" | "saida" | "ajuste";
  quantidade: number;
  observacao?: string;
  criadoEm: string;
  produto?: { nome: string };
};

export const produtosService = {
  listar: () => api.get<Produto[]>("/produtos").then((r) => r.data),
  criar: (data: Omit<Produto, "id" | "estoqueAbaixoMinimo">) =>
    api.post<Produto>("/produtos", data).then((r) => r.data),
  atualizar: (id: string, data: Partial<Produto>) =>
    api.put<Produto>(`/produtos/${id}`, data).then((r) => r.data),
  excluir: (id: string) => api.delete(`/produtos/${id}`),
};

export const movimentacoesService = {
  registrar: (data: { produtoId: string; tipo: "entrada" | "saida"; quantidade: number; observacao?: string }) =>
    api.post("/movimentacoes", data).then((r) => r.data),
  listar: (produtoId?: string) =>
    api.get<Movimentacao[]>("/movimentacoes", { params: { produtoId } }).then((r) => r.data),
};

export const fechamentoService = {
  fecharDia: (itens: { produtoId: string; estoqueContado: number }[]) =>
    api.post("/fechamento", { itens }).then((r) => r.data),
};

export const relatorioService = {
  buscar: (de: string, ate: string) =>
    api.get("/relatorio", { params: { de, ate } }).then((r) => r.data),
};
