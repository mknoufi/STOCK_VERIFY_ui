import React from 'react';
import { Button } from '../Button';

export type EnhancedButtonProps = React.ComponentProps<typeof Button>;

const EnhancedButton: React.FC<EnhancedButtonProps> = (props) => {
  return <Button {...props} />;
};

export default EnhancedButton;
