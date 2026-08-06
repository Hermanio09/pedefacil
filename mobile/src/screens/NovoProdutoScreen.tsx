import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { produtosService } from "../services/api";

export default function NovoProdutoScreen() {
  const navigation = useNavigation();
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("UN");
  const [estoqueAtual, setEstoqueAtual] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("5");
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!nome.trim()) {
      Alert.alert("Atenção", "Informe o nome do produto.");
      return;
    }

    setSalvando(true);
    try {
      await produtosService.criar({
        nome: nome.trim(),
        unidade,
        estoqueAtual: Number(estoqueAtual) || 0,
        estoqueMinimo: Number(estoqueMinimo) || 5,
      });
      navigation.goBack();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar o produto.");
    } finally {
      setSalvando(false);
    }
  };

  const unidades = ["UN", "CX", "L", "KG", "FARDO"];

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Nome do produto *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Coca-Cola 350ml"
        value={nome}
        onChangeText={setNome}
        autoFocus
      />

      <Text style={styles.label}>Unidade</Text>
      <View style={styles.chips}>
        {unidades.map((u) => (
          <TouchableOpacity
            key={u}
            style={[styles.chip, unidade === u && styles.chipAtivo]}
            onPress={() => setUnidade(u)}
          >
            <Text style={[styles.chipTexto, unidade === u && styles.chipTextoAtivo]}>{u}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Estoque atual</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        value={estoqueAtual}
        onChangeText={setEstoqueAtual}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Estoque mínimo (alerta)</Text>
      <TextInput
        style={styles.input}
        placeholder="5"
        value={estoqueMinimo}
        onChangeText={setEstoqueMinimo}
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.botao} onPress={salvar} disabled={salvando}>
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botaoTexto}>Salvar Produto</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  label: { fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff" },
  chipAtivo: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  chipTexto: { color: "#374151", fontWeight: "500" },
  chipTextoAtivo: { color: "#fff" },
  botao: { marginTop: 32, backgroundColor: "#16a34a", padding: 16, borderRadius: 10, alignItems: "center" },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
