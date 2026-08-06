import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { produtosService, Produto } from "../services/api";
import { RootStackParams } from "../navigation";

type Nav = NativeStackNavigationProp<RootStackParams>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await produtosService.listar();
      setProdutos(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const emAlerta = produtos.filter((p) => p.estoqueAbaixoMinimo);

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" color="#16a34a" />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} />}
    >
      {emAlerta.length > 0 && (
        <View style={styles.alertaBox}>
          <Text style={styles.alertaTitulo}>⚠️ Estoque Baixo ({emAlerta.length})</Text>
          {emAlerta.map((p) => (
            <Text key={p.id} style={styles.alertaItem}>
              {p.nome} — {p.estoqueAtual} {p.unidade} (mín: {p.estoqueMinimo})
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.secaoTitulo}>Ações rápidas</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={[styles.card, styles.cardEntrada]} onPress={() => navigation.navigate("Entrada")}>
          <Text style={styles.cardIcon}>📥</Text>
          <Text style={styles.cardTexto}>Registrar{"\n"}Entrada</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.cardSaida]} onPress={() => navigation.navigate("Saida")}>
          <Text style={styles.cardIcon}>📤</Text>
          <Text style={styles.cardTexto}>Registrar{"\n"}Saída</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.cardFechamento]} onPress={() => navigation.navigate("Fechamento")}>
          <Text style={styles.cardIcon}>📋</Text>
          <Text style={styles.cardTexto}>Fechamento{"\n"}do Dia</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.cardProdutos]} onPress={() => navigation.navigate("NovoProduto")}>
          <Text style={styles.cardIcon}>➕</Text>
          <Text style={styles.cardTexto}>Novo{"\n"}Produto</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.secaoTitulo}>Estoque atual</Text>

      {produtos.map((p) => (
        <View key={p.id} style={[styles.produtoRow, p.estoqueAbaixoMinimo && styles.produtoAlerta]}>
          <Text style={styles.produtoNome}>{p.nome}</Text>
          <Text style={[styles.produtoQtd, p.estoqueAbaixoMinimo && styles.produtoQtdAlerta]}>
            {p.estoqueAtual} {p.unidade}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, marginTop: 40 },
  alertaBox: { margin: 16, padding: 14, backgroundColor: "#fef3c7", borderRadius: 10, borderLeftWidth: 4, borderLeftColor: "#f59e0b" },
  alertaTitulo: { fontWeight: "bold", color: "#92400e", marginBottom: 6, fontSize: 15 },
  alertaItem: { color: "#78350f", marginTop: 2 },
  secaoTitulo: { marginHorizontal: 16, marginTop: 20, marginBottom: 10, fontWeight: "bold", fontSize: 16, color: "#374151" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10 },
  card: { width: "44%", margin: "3%", padding: 18, borderRadius: 12, alignItems: "center" },
  cardEntrada: { backgroundColor: "#dcfce7" },
  cardSaida: { backgroundColor: "#fee2e2" },
  cardFechamento: { backgroundColor: "#dbeafe" },
  cardProdutos: { backgroundColor: "#f3f4f6" },
  cardIcon: { fontSize: 28, marginBottom: 6 },
  cardTexto: { textAlign: "center", fontWeight: "600", color: "#1f2937", fontSize: 13 },
  produtoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  produtoAlerta: { backgroundColor: "#fff7ed" },
  produtoNome: { fontSize: 15, color: "#111827" },
  produtoQtd: { fontSize: 15, fontWeight: "bold", color: "#16a34a" },
  produtoQtdAlerta: { color: "#dc2626" },
});
