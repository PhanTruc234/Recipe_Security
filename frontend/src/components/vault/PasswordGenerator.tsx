'use client';

import { useEffect, useState } from 'react';
import {
    generatePassword, entropyBits, crackTime, buildCharset, DEFAULT_OPTIONS, type GenOptions,
} from '@/libs/crypto/passwordGen';

export function PasswordGenerator({ onUse }: { onUse: (password: string) => void }) {
    const [opts, setOpts] = useState<GenOptions>(DEFAULT_OPTIONS);
    const [pw, setPw] = useState('');

    useEffect(() => { setPw(generatePassword(opts)); }, [opts]);
    const regenerate = () => setPw(generatePassword(opts));

    const charsetSize = buildCharset(opts).length;
    const bits = entropyBits(pw, charsetSize);
    const toggle = (k: keyof GenOptions) => setOpts((o) => ({ ...o, [k]: !o[k] }));

    return (
        <div className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-white p-3">
            <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-stone-100 px-2 py-1 text-sm">{pw || '(chọn ít nhất một loại ký tự)'}</code>
                <button type="button" onClick={regenerate} title="Sinh lại" className="text-lg">⟳</button>
            </div>
            <div className="text-xs text-stone-500">Bộ ký tự {charsetSize} · {bits} bit{pw && ` · bẻ khóa ~ ${crackTime(bits)}`}</div>

            <label className="block text-sm">Độ dài: <strong>{opts.length}</strong>
                <input type="range" min={8} max={40} value={opts.length}
                    onChange={(e) => setOpts({ ...opts, length: Number(e.target.value) })} className="w-full" />
            </label>

            <div className="flex flex-wrap gap-3 text-sm">
                {([['lowercase', 'a-z'], ['uppercase', 'A-Z'], ['digits', '0-9'], ['symbols', '!@#$'], ['avoidAmbiguous', 'bỏ dễ nhầm']] as const).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-1">
                        <input type="checkbox" checked={opts[k]} onChange={() => toggle(k)} /> {label}
                    </label>
                ))}
            </div>

            <button type="button" onClick={() => pw && onUse(pw)} disabled={!pw}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
                Dùng mật khẩu này
            </button>
        </div>
    );
}