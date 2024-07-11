import React, { useState } from "react";
import { View, Text, ActionButton, Flex } from '@adobe/react-spectrum';

const CustomAccordion = ({ title, children }: { title: string, children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <View marginY="size-200">
      <View borderWidth="thin" borderColor="dark" borderRadius="medium">
        <ActionButton onPress={toggleAccordion} isQuiet UNSAFE_style={{ width: '100%', textAlign: 'left', padding: '10px 20px' }}>
          <Flex alignItems="center" gap="size-100">
            <Text>{title}</Text>
          </Flex>
        </ActionButton>
      </View>
      {isOpen && (
        <View padding="size-200" borderWidth="thin" borderColor="dark" borderRadius="medium">
          {children}
        </View>
      )}
    </View>
  );
};

export default CustomAccordion;
