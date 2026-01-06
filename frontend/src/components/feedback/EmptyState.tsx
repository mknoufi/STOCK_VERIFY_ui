import React, { ReactNode } from 'react';
import { View, Text, Image, StyleProp, ViewStyle, TextStyle, ImageSourcePropType } from 'react-native';

interface EmptyStateProps {
  title: string;
  message?: string;
  image?: ImageSourcePropType;
  icon?: ReactNode;
  action?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  messageStyle?: StyleProp<TextStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  image,
  icon,
  action,
  containerStyle,
  titleStyle,
  messageStyle,
}) => {
  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        },
        containerStyle,
      ]}
    >
      {image && (
        <Image
          source={image}
          style={{
            width: 120,
            height: 120,
            marginBottom: 24,
            resizeMode: 'contain',
          }}
        />
      )}

      {icon && !image && (
        <View style={{ marginBottom: 24 }}>
          {icon}
        </View>
      )}

      <Text
        style={[
          {
            fontSize: 20,
            fontWeight: '600',
            color: '#333',
            textAlign: 'center',
            marginBottom: 8,
          },
          titleStyle,
        ]}
      >
        {title}
      </Text>

      {message && (
        <Text
          style={[
            {
              fontSize: 16,
              color: '#666',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 24,
            },
            messageStyle,
          ]}
        >
          {message}
        </Text>
      )}

      {action && action}
    </View>
  );
};
