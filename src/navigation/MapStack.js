import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useIsFocused } from "@react-navigation/native";
import MapScreen from "../screens/Map/MapScreen";
import ChooseLocationScreen from "../screens/Map/ChooseLocationScreen";
import SavedFavouriteScreen from "../screens/Map/SavedFavouriteScreen";
import DetailPlaceScreen from "../screens/Map/DetailPlaceScreen";

const Stack = createNativeStackNavigator();

export default function MapStack() {
  const isFocused = useIsFocused();
  return (
    <Stack.Navigator
      initialRouteName="MapScreen"
      screenOptions={{
        headerShown: false,
        animation: isFocused ? "default" : "none",
      }}
    >
      <Stack.Screen name="MapScreen" component={MapScreen} />

      <Stack.Screen name="ChooseLocation" component={ChooseLocationScreen} />

      <Stack.Screen name="SavedFavourite" component={SavedFavouriteScreen} />
      <Stack.Screen name="DetailPlace" component={DetailPlaceScreen} />
    </Stack.Navigator>
  );
}
