"use client";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import TextField from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";
import { useMemo } from "react";
import {
  detectResumeDateFormat,
  normalizeResumeDateInput,
  parseResumeDate,
} from "@/lib/resumes/date-format";

type ResumeDateFieldProps = {
  label: string;
  value: string | null;
  disabled?: boolean;
  onChange: (value: string | null) => void;
  sx?: SxProps<Theme>;
};

export function ResumeDateField({ label, value, disabled, onChange, sx }: ResumeDateFieldProps) {
  const preferredFormat = useMemo(() => detectResumeDateFormat(value), [value]);
  const pickerValue = parseResumeDate(value);

  if (disabled) {
    return <TextField label={label} value={value ?? ""} disabled size="small" sx={sx} />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        views={["year", "month"]}
        value={pickerValue}
        onChange={(next) => {
          if (!next) {
            onChange(null);
            return;
          }
          onChange(next.format(preferredFormat));
        }}
        slotProps={{
          textField: {
            size: "small",
            fullWidth: true,
            sx,
            onBlur: (event) => onChange(normalizeResumeDateInput(event.target.value, preferredFormat) || null),
          },
          field: {
            clearable: true,
            onClear: () => onChange(null),
          },
        }}
      />
    </LocalizationProvider>
  );
}
