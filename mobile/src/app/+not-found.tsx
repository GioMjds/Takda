import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center p-5 bg-surface">
        <Text className="text-xl font-bold text-on-surface">This screen does not exist.</Text>
        <Link href="/" className="mt-4 py-2">
          <Text className="text-primary font-semibold">Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
