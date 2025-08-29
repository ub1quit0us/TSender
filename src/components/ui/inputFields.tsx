"use client";

interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: 'text' | 'textarea';
}

export default function InputField({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = 'text'
}: InputFieldProps) {
  const commonClasses = `w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-colors text-gray-900 placeholder-gray-500 ${
    error ? 'border-red-600 bg-red-50' : 'border-gray-300 hover:border-gray-400'
  }`;

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${commonClasses} resize-vertical`}
          rows={4}
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
        />
      )}
      {error && (
        <p className="mt-2 text-sm font-medium text-red-800 bg-red-50 px-3 py-2 rounded-md border border-red-200">
          {error}
        </p>
      )}
    </div>
  );
}