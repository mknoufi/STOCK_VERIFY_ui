import React from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StatusBar,
} from "react-native";
import Gallery from "react-native-awesome-gallery";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
          <Gallery
            data={images}
            initialIndex={initialIndex}
            onSwipeToClose={onClose}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={StyleSheet.absoluteFillObject}
                contentFit="contain"
              />
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
