import { StyledText } from "@/components";
import { View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center">
      <StyledText variant="extrabold" className="text-xl text-white">
        Edit src/app/index.tsx to edit this screen.
      </StyledText>
    </View>
  );
}
