import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import HomeScreen from "../screens/HomeScreen";
import ProdutosScreen from "../screens/ProdutosScreen";
import NovoProdutoScreen from "../screens/NovoProdutoScreen";
import EntradaScreen from "../screens/EntradaScreen";
import SaidaScreen from "../screens/SaidaScreen";
import FechamentoScreen from "../screens/FechamentoScreen";

export type RootStackParams = {
  Tabs: undefined;
  NovoProduto: undefined;
  Entrada: undefined;
  Saida: undefined;
  Fechamento: undefined;
};

export type TabParams = {
  Home: undefined;
  Produtos: undefined;
};

const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootStackParams>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#059669",
        tabBarInactiveTintColor: "#6b7280",
        headerStyle: { backgroundColor: "#059669" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Início",
          tabBarLabel: "Início",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Produtos"
        component={ProdutosScreen}
        options={{
          title: "Produtos",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📦</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="NovoProduto"
          component={NovoProdutoScreen}
          options={{ title: "Novo Produto", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }}
        />
        <Stack.Screen
          name="Entrada"
          component={EntradaScreen}
          options={{ title: "Registrar Entrada", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }}
        />
        <Stack.Screen
          name="Saida"
          component={SaidaScreen}
          options={{ title: "Registrar Saída", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }}
        />
        <Stack.Screen
          name="Fechamento"
          component={FechamentoScreen}
          options={{ title: "Fechamento do Dia", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
