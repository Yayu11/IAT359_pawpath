import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "../screens/Profile/ProfileScreen";
import PetFormScreen from "../screens/Profile/PetFormScreen";

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />

      <Stack.Screen name="PetForm" component={PetFormScreen} />
    </Stack.Navigator>
  );
}
