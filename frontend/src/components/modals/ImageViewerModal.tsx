import React from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageViewerModalProps {
  visible: boolean;
  images: string[]; // Array of URIs
  initialIndex: number;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  images,
  initialIndex,
  onClose,
}) => {
  const safeInitialIndex = Math.min(
    Math.max(initialIndex, 0),
    Math.max(images.length - 1, 0),
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <StatusBar hidden={true} />
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={safeInitialIndex}
            keyExtractor={(item, index) => `${item}-${index}`}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.page}>
                <Image
                  source={{ uri: item }}
                  style={styles.image}
                  contentFit="contain"
                />
              </View>
            )}
          />
          <SafeAreaView style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    alignItems: "flex-end",
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
});
