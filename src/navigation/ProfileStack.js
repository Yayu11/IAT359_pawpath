import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "../screens/Profile/ProfileScreen";
import PetFormScreen from "../screens/Profile/PetFormScreen";
import PetDetailScreen from "../screens/Profile/PetDetailScreen";

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator
      initialRouteName="ProfileMain"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />

      <Stack.Screen name="PetForm" component={PetFormScreen} />

      <Stack.Screen name="PetDetail" component={PetDetailScreen} />
    </Stack.Navigator>
  );
}
