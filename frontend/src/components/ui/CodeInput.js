import React, { useRef, useEffect, useId } from "react";

/*
 |==========================================================================
 | CodeInput
 |==========================================================================
 | The six-box entry for an emailed one-time code.
 |
 | Value is owned by the parent and is always a plain string of digits — the
 | boxes are a presentation of that string, not six independent fields. That
 | is what makes paste work: a pasted "123456" lands in one box's change
 | event, and because the state is a single string it simply fills all six.
 |
 | Screen readers get one labelled group with a single live description
 | rather than six anonymous one-character inputs.
 */

const LENGTH = 6;

const CodeInput = ({
    value = "",
    onChange,
    onComplete,
    disabled,
    autoFocus,
    invalid,
    id,
    "aria-describedby": describedBy
}) => {
    const inputsRef = useRef([]);
    const uid = useId();
    const digits = value.split("");

    // Fired once per completed code. The ref stops a re-render at length 6
    // (a parent state update, say) from submitting the same code twice.
    const completedRef = useRef(null);

    useEffect(() => {
        if (value.length === LENGTH && completedRef.current !== value) {
            completedRef.current = value;
            onComplete?.(value);
        }
        if (value.length < LENGTH) completedRef.current = null;
    }, [value, onComplete]);

    const focusBox = (index) => {
        const box = inputsRef.current[Math.max(0, Math.min(LENGTH - 1, index))];
        box?.focus();
        box?.select();
    };

    const setValue = (next) => {
        const clean = next.replace(/\D/g, "").slice(0, LENGTH);
        onChange?.(clean);
        return clean;
    };

    const handleChange = (index) => (event) => {
        const typed = event.target.value.replace(/\D/g, "");
        if (!typed) return;

        // More than one digit means a paste (or a fast autofill) — fill from
        // this box onward rather than dropping everything but the first.
        const next = setValue(value.slice(0, index) + typed + value.slice(index + typed.length));
        focusBox(Math.min(index + typed.length, LENGTH - 1));

        return next;
    };

    const handleKeyDown = (index) => (event) => {
        if (event.key === "Backspace") {
            event.preventDefault();

            if (digits[index]) {
                setValue(value.slice(0, index) + value.slice(index + 1));
            } else if (index > 0) {
                // Empty box: delete the digit behind it and step back, which
                // is what "backspace" means to anyone typing this quickly.
                setValue(value.slice(0, index - 1) + value.slice(index));
                focusBox(index - 1);
            }
            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            focusBox(index - 1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            focusBox(index + 1);
        }
    };

    const handlePaste = (event) => {
        const text = event.clipboardData.getData("text").replace(/\D/g, "");
        if (!text) return;

        event.preventDefault();
        const next = setValue(text);
        focusBox(next.length);
    };

    return (
        <div
            className={`code-input ${invalid ? "code-input--invalid" : ""}`}
            role="group"
            aria-labelledby={id}
            aria-describedby={describedBy}
        >
            {Array.from({ length: LENGTH }).map((_, index) => (
                <input
                    key={index}
                    ref={(node) => {
                        inputsRef.current[index] = node;
                    }}
                    id={index === 0 ? id : `${uid}-${index}`}
                    className="code-input__box"
                    // `inputMode` gives phones the number pad; `type=text`
                    // (not number) keeps the spinner and scroll-to-change
                    // behaviour of a number field out of it.
                    type="text"
                    inputMode="numeric"
                    // Lets iOS and Android offer the code straight from the
                    // SMS/email notification instead of making them switch apps.
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={LENGTH}
                    value={digits[index] || ""}
                    onChange={handleChange(index)}
                    onKeyDown={handleKeyDown(index)}
                    onPaste={handlePaste}
                    onFocus={(event) => event.target.select()}
                    disabled={disabled}
                    autoFocus={autoFocus && index === 0}
                    aria-label={`Digit ${index + 1} of ${LENGTH}`}
                />
            ))}
        </div>
    );
};

export default CodeInput;
