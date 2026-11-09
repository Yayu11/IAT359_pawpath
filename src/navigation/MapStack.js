import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MapScreen from "../screens/Map/MapScreen";
import ChooseLocationScreen from "../screens/Map/ChooseLocationScreen";
import SavedFavouriteScreen from "../screens/Map/SavedFavouriteScreen";

const Stack = createNativeStackNavigator();

export default function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapScreen" component={MapScreen} />

      <Stack.Screen name="ChooseLocation" component={ChooseLocationScreen} />

      <Stack.Screen name="SavedFavourite" component={SavedFavouriteScreen} />
    </Stack.Navigator>
  );
}
