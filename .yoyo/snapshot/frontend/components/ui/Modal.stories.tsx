/**
 * Modal Component Stories
 *
 * Documentation and examples for the Modal component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../Button';
import { useState } from 'react';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    docs: {
      description: {
        component: 'Modern modal dialog component with backdrop, animations, and customizable sizes. Supports web and native platforms.',
      },
    },
  },
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Control modal visibility',
    },
    title: {
      control: 'text',
      description: 'Modal title',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'fullscreen'],
      description: 'Modal size',
    },
    animationType: {
      control: 'select',
      options: ['slide', 'fade', 'none'],
      description: 'Animation type',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Show close button',
    },
    closeOnBackdropPress: {
      control: 'boolean',
      description: 'Close when backdrop is pressed',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Interactive wrapper for stories
const ModalWrapper = ({ children, ...props }: any) => {
  const [visible, setVisible] = useState(props.visible || false);

  return (
    <View>
      <Button
        title="Open Modal"
        onPress={() => setVisible(true)}
        style={styles.openButton}
      />
      <Modal
        {...props}
        visible={visible}
        onClose={() => setVisible(false)}
      >
        {children}
      </Modal>
    </View>
  );
};

// Default story
export const Default: Story = {
  render: () => (
    <ModalWrapper>
      <Text>This is a default modal with basic content.</Text>
    </ModalWrapper>
  ),
};

// With Title
export const WithTitle: Story = {
  render: () => (
    <ModalWrapper title="Modal Title">
      <Text>This modal has a title.</Text>
    </ModalWrapper>
  ),
};

// Small Size
export const Small: Story = {
  render: () => (
    <ModalWrapper title="Small Modal" size="small">
      <Text>This is a small modal (80% width, max 400px).</Text>
    </ModalWrapper>
  ),
};

// Medium Size
export const Medium: Story = {
  render: () => (
    <ModalWrapper title="Medium Modal" size="medium">
      <Text>This is a medium modal (90% width, max 600px).</Text>
    </ModalWrapper>
  ),
};

// Large Size
export const Large: Story = {
  render: () => (
    <ModalWrapper title="Large Modal" size="large">
      <Text>This is a large modal (95% width, max 900px).</Text>
    </ModalWrapper>
  ),
};

// Fullscreen
export const Fullscreen: Story = {
  render: () => (
    <ModalWrapper title="Fullscreen Modal" size="fullscreen">
      <View style={styles.fullscreenContent}>
        <Text style={styles.fullscreenText}>This modal takes up the full screen.</Text>
        <Text style={styles.fullscreenText}>Useful for complex forms or detailed views.</Text>
      </View>
    </ModalWrapper>
  ),
};

// With Complex Content
export const ComplexContent: Story = {
  render: () => (
    <ModalWrapper title="Confirm Action">
      <View style={styles.complexContent}>
        <Text style={styles.message}>
          Are you sure you want to delete this item? This action cannot be undone.
        </Text>
        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => {}}
            style={styles.button}
          />
          <Button
            title="Delete"
            variant="danger"
            onPress={() => {}}
            style={styles.button}
          />
        </View>
      </View>
    </ModalWrapper>
  ),
};

// Without Close Button
export const WithoutCloseButton: Story = {
  render: () => (
    <ModalWrapper title="No Close Button" showCloseButton={false}>
      <Text>This modal doesn't have a close button. Use backdrop press or custom action to close.</Text>
    </ModalWrapper>
  ),
};

// Animation Types
export const FadeAnimation: Story = {
  render: () => (
    <ModalWrapper title="Fade Animation" animationType="fade">
      <Text>This modal uses fade animation.</Text>
    </ModalWrapper>
  ),
};

export const SlideAnimation: Story = {
  render: () => (
    <ModalWrapper title="Slide Animation" animationType="slide">
      <Text>This modal uses slide animation.</Text>
    </ModalWrapper>
  ),
};

const styles = StyleSheet.create({
  openButton: {
    marginBottom: 20,
  },
  complexContent: {
    gap: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  fullscreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullscreenText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
});
