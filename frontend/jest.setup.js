// Jest setup: mock @expo/vector-icons to avoid act warnings in tests (CommonJS, no JSX)
const React = require("react");
const { View, Text } = require("react-native");

const MockIcon = ({ name = "icon", size = 16, color = "black", testID }) =>
  React.createElement(
    View,
    { style: { width: size, height: size }, testID: testID || `mock-icon-${name}` },
    React.createElement(Text, { style: { color } }, name)
  );

jest.mock("@expo/vector-icons", () => ({
  Ionicons: MockIcon,
  MaterialIcons: MockIcon,
  FontAwesome: MockIcon,
  Entypo: MockIcon,
  AntDesign: MockIcon,
  Feather: MockIcon,
  SimpleLineIcons: MockIcon,
  EvilIcons: MockIcon,
  Foundation: MockIcon,
  Zocial: MockIcon,
}));
