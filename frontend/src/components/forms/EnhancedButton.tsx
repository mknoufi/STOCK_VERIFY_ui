import React from "react";
import { Button } from "../Button";

export type FormEnhancedButtonProps = React.ComponentProps<typeof Button>;

const EnhancedButton: React.FC<FormEnhancedButtonProps> = (props) => {
  return <Button {...props} />;
};

export default EnhancedButton;
