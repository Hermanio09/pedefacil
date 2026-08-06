import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { produtosService, Produto } from "../services/api";
import { RootStackParams } from "../navigation";

type Nav = NativeStackNavigationProp<RootStackParams>;

export default function ProdutosScreen() {
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

  const excluir = (produto: Produto) => {
    Alert.alert("Excluir", `Excluir "${produto.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await produtosService.excluir(produto.id);
          carregar();
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#16a34a" />;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.botaoNovo} onPress={() => navigation.navigate("NovoProduto")}>
        <Text style={styles.botaoNovoTexto}>+ Novo Produto</Text>
      </TouchableOpacity>

      <FlatList
        data={produtos}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} />}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhum produto cadastrado.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.item, item.estoqueAbaixoMinimo && styles.itemAlerta]}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemNome}>{item.nome}</Text>
              <Text style={styles.itemDetalhe}>
                Estoque: {item.estoqueAtual} {item.unidade} · Mín: {item.estoqueMinimo}
              </Text>
            </View>
            <View style={styles.itemAcoes}>
              {item.estoqueAbaixoMinimo && <Text style={styles.alertaTag}>⚠️</Text>}
              <TouchableOpacity onPress={() => excluir(item)}>
                <Text style={styles.excluir}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, marginTop: 40 },
  botaoNovo: { margin: 16, backgroundColor: "#16a34a", padding: 14, borderRadius: 10, alignItems: "center" },
  botaoNovoTexto: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  vazio: { textAlign: "center", marginTop: 40, color: "#6b7280" },
  item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginVertical: 5, padding: 14, borderRadius: 10 },
  itemAlerta: { borderLeftWidth: 4, borderLeftColor: "#f59e0b" },
  itemInfo: { flex: 1 },
  itemNome: { fontSize: 15, fontWeight: "600", color: "#111827" },
  itemDetalhe: { marginTop: 3, color: "#6b7280", fontSize: 13 },
  itemAcoes: { flexDirection: "row", alignItems: "center", gap: 10 },
  alertaTag: { fontSize: 18 },
  excluir: { fontSize: 20, marginLeft: 8 },
});
