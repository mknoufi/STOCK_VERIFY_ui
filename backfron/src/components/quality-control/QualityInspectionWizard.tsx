import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

// Components
import { ModernCard } from "../ModernCard";
import EnhancedTextInput from "../forms/EnhancedTextInput";
import EnhancedButton from "../forms/EnhancedButton";
import { LoadingSpinner } from "../feedback/LoadingSpinner";
import { useToast } from "../feedback/ToastProvider";

// Services
import { qualityControlApi } from "../../services/api/qualityControlApi";

// Types
import { Item } from "../../types/item";

interface QualityInspectionForm {
  itemCode: string;
  conditionStatus: "GOOD" | "DAMAGED" | "EXPIRED";
  expiryDate?: string;
  qualityNotes?: string;
  photos: string[];
  disposition: "ACCEPTED" | "REJECTED" | "QUARANTINE";
}

interface QualityInspectionWizardProps {
  item: Item;
  sessionId?: string;
  onComplete?: () => void;
}

const CONDITION_OPTIONS = [
  { label: "Good", value: "GOOD" as const },
  { label: "Damaged", value: "DAMAGED" as const },
  { label: "Expired", value: "EXPIRED" as const },
];

const DISPOSITION_OPTIONS = [
  { label: "Accept", value: "ACCEPTED" as const },
  { label: "Reject", value: "REJECTED" as const },
  { label: "Quarantine", value: "QUARANTINE" as const },
];

export const QualityInspectionWizard: React.FC<
  QualityInspectionWizardProps
> = ({ item, sessionId, onComplete }) => {
  const navigation = useNavigation();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QualityInspectionForm>({
    defaultValues: {
      itemCode: item.item_code,
      conditionStatus: "GOOD",
      qualityNotes: "",
      photos: [],
      disposition: "ACCEPTED",
    },
  });

  const watchedCondition = watch("conditionStatus");

  const steps = [
    {
      title: "Item Details",
      component: "item-details",
    },
    {
      title: "Condition Assessment",
      component: "condition-assessment",
    },
    {
      title: "Additional Details",
      component: "additional-details",
    },
    {
      title: "Review & Submit",
      component: "review-submit",
    },
  ];

  const handlePhotoCapture = async () => {
    // TODO: Implement photo capture using camera
    Alert.alert(
      "Photo Capture",
      "Photo capture functionality will be implemented",
    );
  };

  const onSubmit = async (data: QualityInspectionForm) => {
    setIsLoading(true);
    try {
      const inspectionData = {
        ...data,
        photos,
        session_id: sessionId,
      };

      const response = await qualityControlApi.createInspection(inspectionData);

      toast.show("Quality inspection completed successfully", "success");

      if (onComplete) {
        onComplete();
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error("Quality inspection submission error:", error);
      toast.show("Failed to submit quality inspection", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderItemDetails = () => (
    <ModernCard style={styles.stepCard}>
      <View style={styles.itemInfo}>
        <EnhancedTextInput
          label="Item Code"
          value={item.item_code}
          editable={false}
          style={styles.readOnlyInput}
        />
        <EnhancedTextInput
          label="Item Name"
          value={item.item_name}
          editable={false}
          style={styles.readOnlyInput}
        />
        <EnhancedTextInput
          label="Barcode"
          value={item.barcode}
          editable={false}
          style={styles.readOnlyInput}
        />
      </View>

      <View style={styles.photoSection}>
        <EnhancedButton
          title="Take Photo"
          onPress={handlePhotoCapture}
          variant="secondary"
          icon="camera"
        />
        {photos.length > 0 && (
          <EnhancedTextInput
            label="Photos Captured"
            value={`${photos.length} photo(s)`}
            editable={false}
            style={styles.readOnlyInput}
          />
        )}
      </View>
    </ModernCard>
  );

  const renderConditionAssessment = () => (
    <ModernCard style={styles.stepCard}>
      <Controller
        control={control}
        name="conditionStatus"
        rules={{ required: "Condition status is required" }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.conditionOptions}>
            {CONDITION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.conditionOption,
                  value === option.value && styles.conditionOptionSelected,
                ]}
                onPress={() => onChange(option.value)}
              >
                <EnhancedTextInput
                  label={option.label}
                  value={option.label}
                  editable={false}
                  style={styles.conditionInput}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      {watchedCondition === "EXPIRED" && (
        <Controller
          control={control}
          name="expiryDate"
          rules={{ required: "Expiry date is required for expired items" }}
          render={({ field: { onChange, value } }) => (
            <EnhancedTextInput
              label="Expiry Date"
              value={value}
              onChangeText={onChange}
              placeholder="YYYY-MM-DD"
              error={errors.expiryDate?.message}
            />
          )}
        />
      )}
    </ModernCard>
  );

  const renderAdditionalDetails = () => (
    <ModernCard style={styles.stepCard}>
      <Controller
        control={control}
        name="qualityNotes"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            label="Quality Notes"
            value={value}
            onChangeText={onChange}
            multiline
            numberOfLines={4}
            placeholder="Enter any quality observations or notes..."
          />
        )}
      />

      <Controller
        control={control}
        name="disposition"
        rules={{ required: "Disposition is required" }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.dispositionOptions}>
            {DISPOSITION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dispositionOption,
                  value === option.value && styles.dispositionOptionSelected,
                ]}
                onPress={() => onChange(option.value)}
              >
                <EnhancedTextInput
                  label={option.label}
                  value={option.label}
                  editable={false}
                  style={styles.dispositionInput}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    </ModernCard>
  );

  const renderReviewSubmit = () => (
    <ModernCard style={styles.stepCard}>
      <View style={styles.reviewSection}>
        <EnhancedTextInput
          label="Item Code"
          value={item.item_code}
          editable={false}
          style={styles.reviewInput}
        />
        <EnhancedTextInput
          label="Condition Status"
          value={watch("conditionStatus")}
          editable={false}
          style={styles.reviewInput}
        />
        <EnhancedTextInput
          label="Disposition"
          value={watch("disposition")}
          editable={false}
          style={styles.reviewInput}
        />
        {watch("expiryDate") && (
          <EnhancedTextInput
            label="Expiry Date"
            value={watch("expiryDate")}
            editable={false}
            style={styles.reviewInput}
          />
        )}
        {watch("qualityNotes") && (
          <EnhancedTextInput
            label="Quality Notes"
            value={watch("qualityNotes")}
            editable={false}
            multiline
            style={styles.reviewInput}
          />
        )}
      </View>

      <View style={styles.submitSection}>
        <EnhancedButton
          title="Submit Inspection"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.submitButton}
        />
      </View>
    </ModernCard>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderItemDetails();
      case 1:
        return renderConditionAssessment();
      case 2:
        return renderAdditionalDetails();
      case 3:
        return renderReviewSubmit();
      default:
        return null;
    }
  };

  const canProceedToNext = () => {
    // Add validation logic for each step
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ModernCard style={styles.headerCard}>
          <EnhancedTextInput
            label="Quality Inspection"
            value={`Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep]?.title || ""}`}
            editable={false}
            style={styles.stepIndicator}
          />

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / steps.length) * 100}%` },
              ]}
            />
          </View>
        </ModernCard>

        {renderCurrentStep()}

        {currentStep < steps.length - 1 && (
          <View style={styles.navigationButtons}>
            <EnhancedButton
              title="Previous"
              onPress={() => setCurrentStep(currentStep - 1)}
              disabled={currentStep === 0}
              variant="secondary"
              style={styles.navButton}
            />
            <EnhancedButton
              title="Next"
              onPress={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceedToNext()}
              style={styles.navButton}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  stepIndicator: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  stepCard: {
    marginBottom: 16,
  },
  itemInfo: {
    gap: 12,
  },
  readOnlyInput: {
    backgroundColor: "#f8f8f8",
  },
  photoSection: {
    marginTop: 16,
    gap: 12,
  },
  conditionOptions: {
    gap: 12,
  },
  conditionOption: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
  },
  conditionOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  conditionInput: {
    margin: 0,
  },
  dispositionOptions: {
    marginTop: 16,
    gap: 12,
  },
  dispositionOption: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
  },
  dispositionOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  dispositionInput: {
    margin: 0,
  },
  reviewSection: {
    gap: 12,
  },
  reviewInput: {
    backgroundColor: "#f8f8f8",
  },
  submitSection: {
    marginTop: 24,
  },
  submitButton: {
    minHeight: 48,
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  navButton: {
    flex: 1,
  },
});
