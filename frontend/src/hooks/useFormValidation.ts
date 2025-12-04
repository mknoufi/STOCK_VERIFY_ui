import { useCallback, useMemo, useState } from "react";

type ValidationRule =
  | string
  | {
      message: string;
    };

interface FieldRules {
  required?: ValidationRule;
  minLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  custom?: (value: any) => string | null;
}

export interface FieldConfig<TValues extends Record<string, any>> {
  name: keyof TValues & string;
  label?: string;
  defaultValue?: TValues[keyof TValues];
  rules?: FieldRules;
}

export interface FormValidationResult<TValues extends Record<string, any>> {
  values: TValues;
  errors: Partial<Record<keyof TValues & string, string>>;
  touched: Partial<Record<keyof TValues & string, boolean>>;
  isSubmitting: boolean;
  setValue: (
    name: keyof TValues & string,
    value: TValues[keyof TValues],
  ) => void;
  setFieldTouched: (name: keyof TValues & string, touched: boolean) => void;
  setFieldError: (name: keyof TValues & string, error?: string) => void;
  handleSubmit: (
    callback: (values: TValues) => void | Promise<void>,
  ) => () => Promise<void>;
}

const getRuleMessage = (rule?: ValidationRule): string | undefined => {
  if (!rule) {
    return undefined;
  }
  if (typeof rule === "string") {
    return rule;
  }
  return rule.message;
};

export function useFormValidation<TValues extends Record<string, any>>(
  configs: FieldConfig<TValues>[],
): FormValidationResult<TValues> {
  const initialValues = useMemo(() => {
    return configs.reduce((acc, config) => {
      const name = config.name as keyof TValues;
      acc[name] = (config.defaultValue ?? "") as TValues[typeof name];
      return acc;
    }, {} as TValues);
  }, [configs]);

  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<FormValidationResult<TValues>["errors"]>(
    {},
  );
  const [touched, setTouched] = useState<
    FormValidationResult<TValues>["touched"]
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const configMap = useMemo(() => {
    return configs.reduce<Record<string, FieldConfig<TValues>>>(
      (acc, config) => {
        acc[config.name] = config;
        return acc;
      },
      {},
    );
  }, [configs]);

  const validateField = useCallback(
    (name: keyof TValues & string, value: TValues[keyof TValues]) => {
      const config = configMap[name];
      if (!config?.rules) {
        return undefined;
      }
      const { rules } = config;
      const trimmedValue = typeof value === "string" ? value.trim() : value;

      if (rules.required) {
        if (
          trimmedValue === "" ||
          trimmedValue === undefined ||
          trimmedValue === null
        ) {
          return (
            getRuleMessage(rules.required) ??
            `${config.label ?? name} is required`
          );
        }
      }

      if (
        rules.minLength &&
        typeof trimmedValue === "string" &&
        trimmedValue.length < rules.minLength.value
      ) {
        return rules.minLength.message;
      }

      if (
        rules.pattern &&
        typeof trimmedValue === "string" &&
        !rules.pattern.value.test(trimmedValue)
      ) {
        return rules.pattern.message;
      }

      if (rules.custom) {
        const customError = rules.custom(trimmedValue);
        if (customError) {
          return customError;
        }
      }

      return undefined;
    },
    [configMap],
  );

  const validateAll = useCallback(() => {
    const validationErrors: FormValidationResult<TValues>["errors"] = {};
    (Object.keys(configMap) as Array<keyof TValues & string>).forEach(
      (name) => {
        const errorMessage = validateField(name, values[name]);
        if (errorMessage) {
          validationErrors[name] = errorMessage;
        }
      },
    );
    setErrors(validationErrors);
    return validationErrors;
  }, [configMap, validateField, values]);

  const setValue = useCallback<FormValidationResult<TValues>["setValue"]>(
    (name, value) => {
      setValues((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [],
  );

  const setFieldTouched = useCallback<
    FormValidationResult<TValues>["setFieldTouched"]
  >((name, isFieldTouched) => {
    setTouched((prev) => ({
      ...prev,
      [name]: isFieldTouched,
    }));
  }, []);

  const setFieldError = useCallback<
    FormValidationResult<TValues>["setFieldError"]
  >((name, errorMessage) => {
    setErrors((prev) => ({
      ...prev,
      [name]: errorMessage,
    }));
  }, []);

  const handleSubmit: FormValidationResult<TValues>["handleSubmit"] =
    useCallback(
      (callback) => {
        return async () => {
          setIsSubmitting(true);
          const validationErrors = validateAll();
          if (Object.keys(validationErrors).length > 0) {
            setIsSubmitting(false);
            return;
          }
          try {
            await callback(values);
          } finally {
            setIsSubmitting(false);
          }
        };
      },
      [validateAll, values],
    );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    setFieldError,
    handleSubmit,
  };
}
