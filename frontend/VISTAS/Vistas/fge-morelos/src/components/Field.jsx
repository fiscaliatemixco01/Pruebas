export function TextField({ label, hint, ...props }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="field-input" {...props} />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function TextArea({ label, ...props }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea className="field-textarea" {...props} />
    </label>
  );
}

export function SelectField({ label, options, placeholder = "Selecciona...", ...props }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="field-select" {...props}>
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Checkbox({ label, checked, onChange }) {
  return (
    <label className="radio-option">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function RadioGroup({ label, name, options, value, onChange }) {
  return (
    <div className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <div className="radio-row">
        {options.map((opt) => (
          <label key={opt.value} className="radio-option">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(e.target.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
