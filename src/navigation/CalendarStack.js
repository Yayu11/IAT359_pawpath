import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CalendarScreen from "../screens/Calendar/CalendarScreen";
import CreateMemoryScreen from "../screens/Calendar/CreateMemoryScreen";
import PlanWalkScreen from "../screens/Calendar/PlanWalkScreen";
import MemoryDetailScreen from "../screens/Calendar/MemoryDetailScreen";
import WalkDetailScreen from "../screens/Calendar/WalkDetailScreen";

const Stack = createNativeStackNavigator();

export default function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CalendarHome" component={CalendarScreen} />

      <Stack.Screen name="CreateMemory" component={CreateMemoryScreen} />
      <Stack.Screen name="PlanWalk" component={PlanWalkScreen} />
      <Stack.Screen
        name="MemoryDetail"
        component={MemoryDetailScreen}
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen name="WalkDetail" component={WalkDetailScreen} />
    </Stack.Navigator>
  );
}
