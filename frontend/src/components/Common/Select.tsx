import React from 'react';
import Select, { type MultiValue, type SingleValue, type StylesConfig } from 'react-select';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  value?: Option | Option[] | null;
  onChange: (value: Option | Option[] | null) => void;
  placeholder?: string;
  isMulti?: boolean;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  className?: string;
}

/**
 * Styled Select component using react-select
 * 
 * @example
 * ```tsx
 * <CustomSelect
 *   options={countries}
 *   value={selectedCountries}
 *   onChange={setSelectedCountries}
 *   isMulti
 *   placeholder="Select countries..."
 * />
 * ```
 */
export const CustomSelect: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isMulti = false,
  isSearchable = true,
  isClearable = true,
  isDisabled = false,
  className = ''
}) => {
  const handleChange = (newValue: MultiValue<Option> | SingleValue<Option>) => {
    if (isMulti) {
      onChange(newValue as Option[]);
    } else {
      onChange(newValue as Option);
    }
  };
  
  const customStyles: StylesConfig<Option, boolean> = {
    control: (provided, state) => ({
      ...provided,
      borderColor: state.isFocused ? '#DC2626' : '#D1D5DB',
      boxShadow: state.isFocused ? '0 0 0 1px #DC2626' : 'none',
      '&:hover': {
        borderColor: '#DC2626'
      }
    }),
    option: (provided, state) => {
      let backgroundColor = 'white';
      if (state.isSelected) {
        backgroundColor = '#DC2626';
      } else if (state.isFocused) {
        backgroundColor = '#FEE2E2';
      }
      
      return {
        ...provided,
        backgroundColor,
        color: state.isSelected ? 'white' : '#1F2937',
        '&:hover': {
          backgroundColor: state.isSelected ? '#DC2626' : '#FEE2E2'
        }
      };
    },
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#FEE2E2'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#991B1B'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#991B1B',
      '&:hover': {
        backgroundColor: '#DC2626',
        color: 'white'
      }
    })
  };
  
  return (
    <Select
      options={options}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      isMulti={isMulti}
      isSearchable={isSearchable}
      isClearable={isClearable}
      isDisabled={isDisabled}
      className={className}
      styles={customStyles}
    />
  );
};
