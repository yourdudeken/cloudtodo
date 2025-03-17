import React, { useState, useRef, useEffect } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface DigitVerificationProps {
  onVerify: (code: string) => void;
  onCancel: () => void;
  email: string;
}

export const DigitVerification: React.FC<DigitVerificationProps> = ({ onVerify, onCancel, email }) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Submit if all digits are filled
    if (value && index === 5) {
      const code = newDigits.join('');
      if (code.length === 6) {
        handleSubmit(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace if current input is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (code: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      await onVerify(code);
    } catch (err) {
      setError('Invalid verification code. Please try again.');
      // Clear inputs on error
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
          Two-Step Verification
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Enter the 6-digit code sent to<br />
          <span className="font-medium">{email}</span>
        </p>

        <div className="flex justify-center space-x-2 mb-6">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              maxLength={1}
              value={digit}
              onChange={e => handleDigitChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              className={`w-12 h-12 text-center text-2xl font-bold border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:bg-gray-700 dark:border-gray-600 dark:text-white
                ${error ? 'border-red-500 dark:border-red-500' : 'border-gray-300'}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 dark:text-red-400 text-center mb-4">
            {error}
          </p>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(digits.join(''))}
            disabled={digits.some(d => !d) || isLoading}
            className={`px-4 py-2 rounded-lg flex items-center ${
              isLoading || digits.some(d => !d)
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
            } text-white`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </span>
            ) : (
              <>
                Verify
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Didn't receive the code?{' '}
          <button className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
            Resend
          </button>
        </p>
      </div>
    </div>
  );
};