import React from 'react';
import { Input } from '../Input';

export type EnhancedTextInputProps = React.ComponentProps<typeof Input>;

const EnhancedTextInput = React.forwardRef<any, EnhancedTextInputProps>((props, ref) => {
  return <Input {...props} ref={ref} />;
});

EnhancedTextInput.displayName = 'EnhancedTextInput';

export default EnhancedTextInput;
