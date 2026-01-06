import React from "react";
import { ModernButton } from "../ui/ModernButton";

export type EnhancedButtonProps = React.ComponentProps<typeof ModernButton>;

const EnhancedButton: React.FC<EnhancedButtonProps> = (props) => {
  return <ModernButton {...props} />;
};

export default EnhancedButton;
