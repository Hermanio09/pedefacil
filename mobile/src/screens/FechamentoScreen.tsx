import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { produtosService, fechamentoService, Produto } from "../services/api";

type Item = { produto: Produto; estoqueContado: string };

export default function FechamentoScreen() {
  const navigation = useNavigation();
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    produtosService.listar().then((data) => {
      setItens(data.map((p) => ({ produto: p, estoqueContado: "" })));
      setLoading(false);
    });
  }, []);

  const atualizar = (produtoId: string, valor: string) => {
    setItens((prev) =>
      prev.map((i) => i.produto.id === produtoId ? { ...i, estoqueContado: valor } : i)
    );
  };

  const confirmar = async () => {
    const preenchidos = itens.filter((i) => i.estoqueContado !== "");
    if (preenchidos.length === 0) {
      Alert.alert("Atenção", "Informe o estoque de pelo menos um produto.");
      return;
    }

    Alert.alert(
      "Confirmar fechamento",
      `Processar ${preenchidos.length} produto(s)?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setSalvando(true);
            try {
              const resultado = await fechamentoService.fecharDia(
                preenchidos.map((i) => ({
                  produtoId: i.produto.id,
                  estoqueContado: Number(i.estoqueContado),
                }))
              );

              const linhas = resultado.resultados.map((r: { produto: string; saida: number; entradaNaoRegistrada: number; estoqueAnterior: number; estoqueContado: number }) =>
                `${r.produto}: saiu ${r.saida} ${r.entradaNaoRegistrada ? `(+${r.entradaNaoRegistrada} não reg.)` : ""}`
              );

              const alertas = resultado.alertas as string[];
              const msgAlerta = alertas.length > 0 ? `\n\n⚠️ Estoque baixo:\n${alertas.join(", ")}` : "";

              Alert.alert("Fechamento concluído!", linhas.join("\n") + msgAlerta, [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch {
              Alert.alert("Erro", "Não foi possível processar o fechamento.");
            } finally {
              setSalvando(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#16a34a" />;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.instrucao}>
        <Text style={styles.instrucaoTitulo}>Como funciona?</Text>
        <Text style={styles.instrucaoTexto}>
          Conte o que sobrou em cada produto. O sistema calcula automaticamente a saída do dia.{"\n"}
          Deixe em branco os que não quiser registrar.
        </Text>
      </View>

      {itens.map((item) => {
        const contado = Number(item.estoqueContado);
        const diferenca = item.estoqueContado !== "" ? contado - item.produto.estoqueAtual : null;

        return (
          <View key={item.produto.id} style={styles.linha}>
            <View style={styles.linhaNome}>
              <Text style={styles.nomeProduto}>{item.produto.nome}</Text>
              <Text style={styles.estoqueEsperado}>Esperado: {item.produto.estoqueAtual} {item.produto.unidade}</Text>
            </View>
            <View style={styles.linhaInput}>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={item.estoqueContado}
                onChangeText={(v) => atualizar(item.produto.id, v)}
                keyboardType="numeric"
              />
              {diferenca !== null && (
                <Text style={[styles.diferenca, diferenca < 0 ? styles.diferencaNeg : styles.diferencaPos]}>
                  {diferenca < 0 ? `↓ ${Math.abs(diferenca)} saíram` : diferenca > 0 ? `↑ ${diferenca} extras` : "✓ igual"}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      <TouchableOpacity style={styles.botao} onPress={confirmar} disabled={salvando}>
        {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>📋 Confirmar Fechamento</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  center: { flex: 1, marginTop: 40 },
  instrucao: { backgroundColor: "#dbeafe", padding: 14, borderRadius: 10, marginBottom: 16 },
  instrucaoTitulo: { fontWeight: "bold", color: "#1e40af", marginBottom: 4 },
  instrucaoTexto: { color: "#1e3a8a", lineHeight: 20 },
  linha: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 10 },
  linhaNome: { marginBottom: 8 },
  nomeProduto: { fontWeight: "600", fontSize: 15, color: "#111827" },
  estoqueEsperado: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  linhaInput: { flexDirection: "row", alignItems: "center", gap: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 10, fontSize: 15 },
  diferenca: { fontSize: 13, fontWeight: "600" },
  diferencaNeg: { color: "#dc2626" },
  diferencaPos: { color: "#16a34a" },
  botao: { marginTop: 8, marginBottom: 40, backgroundColor: "#16a34a", padding: 16, borderRadius: 10, alignItems: "center" },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
