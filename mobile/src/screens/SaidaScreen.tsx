import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { produtosService, movimentacoesService, Produto } from "../services/api";

export default function SaidaScreen() {
  const navigation = useNavigation();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    produtosService.listar().then((data) => {
      setProdutos(data);
      setLoading(false);
    });
  }, []);

  const salvar = async () => {
    if (!produtoId) { Alert.alert("Atenção", "Selecione um produto."); return; }
    if (!quantidade || Number(quantidade) <= 0) { Alert.alert("Atenção", "Informe a quantidade."); return; }

    const produto = produtos.find((p) => p.id === produtoId);
    if (produto && Number(quantidade) > produto.estoqueAtual) {
      Alert.alert("Atenção", `Estoque insuficiente. Disponível: ${produto.estoqueAtual} ${produto.unidade}`);
      return;
    }

    setSalvando(true);
    try {
      const resultado = await movimentacoesService.registrar({ produtoId, tipo: "saida", quantidade: Number(quantidade), observacao });
      const msg = resultado.alerta
        ? `Saída registrada!\n⚠️ Estoque baixo: ${resultado.estoqueAtual} ${produto?.unidade}`
        : `Saída registrada! Estoque: ${resultado.estoqueAtual} ${produto?.unidade}`;

      Alert.alert("Sucesso", msg, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch {
      Alert.alert("Erro", "Não foi possível registrar a saída.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#16a34a" />;

  const produtoSelecionado = produtos.find((p) => p.id === produtoId);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Produto *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listaProdutos}>
        {produtos.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chipProduto, produtoId === p.id && styles.chipProdutoAtivo, p.estoqueAbaixoMinimo && styles.chipProdutoAlerta]}
            onPress={() => setProdutoId(p.id)}
          >
            <Text style={[styles.chipProdutoTexto, produtoId === p.id && styles.chipProdutoTextoAtivo]}>
              {p.nome}
            </Text>
            <Text style={[styles.chipProdutoQtd, produtoId === p.id && styles.chipProdutoTextoAtivo]}>
              {p.estoqueAtual} {p.unidade} {p.estoqueAbaixoMinimo ? "⚠️" : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {produtoSelecionado && (
        <View style={[styles.infoAtual, produtoSelecionado.estoqueAbaixoMinimo && styles.infoAlerta]}>
          <Text style={styles.infoTexto}>
            Estoque atual: <Text style={styles.infoBold}>{produtoSelecionado.estoqueAtual} {produtoSelecionado.unidade}</Text>
            {produtoSelecionado.estoqueAbaixoMinimo ? "  ⚠️ Abaixo do mínimo" : ""}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Quantidade *</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Observação (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Mesa 5, turno tarde"
        value={observacao}
        onChangeText={setObservacao}
      />

      <TouchableOpacity style={[styles.botao, styles.botaoSaida]} onPress={salvar} disabled={salvando}>
        {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>📤 Confirmar Saída</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  center: { flex: 1, marginTop: 40 },
  label: { fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 16 },
  listaProdutos: { marginBottom: 4 },
  chipProduto: { marginRight: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff", minWidth: 120, alignItems: "center" },
  chipProdutoAtivo: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  chipProdutoAlerta: { borderColor: "#f59e0b" },
  chipProdutoTexto: { color: "#374151", fontWeight: "600" },
  chipProdutoTextoAtivo: { color: "#fff" },
  chipProdutoQtd: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  infoAtual: { backgroundColor: "#dcfce7", padding: 10, borderRadius: 8, marginTop: 8 },
  infoAlerta: { backgroundColor: "#fef3c7" },
  infoTexto: { color: "#166534" },
  infoBold: { fontWeight: "bold" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 15 },
  botao: { marginTop: 32, padding: 16, borderRadius: 10, alignItems: "center" },
  botaoSaida: { backgroundColor: "#dc2626" },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
