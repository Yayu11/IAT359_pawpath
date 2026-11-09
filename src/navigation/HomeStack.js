import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/Home/HomeScreen";
import SelectPetScreen from "../screens/Home/SelectPetScreen";
import StartWalkScreen from "../screens/Home/StartWalkScreen";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SelectPet" component={SelectPetScreen} />
      <Stack.Screen name="StartWalk" component={StartWalkScreen} />
    </Stack.Navigator>
  );
}
