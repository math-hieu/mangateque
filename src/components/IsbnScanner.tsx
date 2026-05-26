"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lookupIsbn } from "@/actions/isbn";
import type { IsbnLookupResult } from "@/lib/types";
import { ScanResult } from "./ScanResult";

type ScanState =
  | { step: "scanning" }
  | { step: "loading"; isbn: string }
  | { step: "result"; data: IsbnLookupResult }
  | { step: "error"; message: string };

export function IsbnScanner() {
  const [state, setState] = useState<ScanState>({ step: "scanning" });
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<any>(null);

  const stopScanner = useCallback(async () => {
    try {
      const scanner = html5QrRef.current;
      if (scanner) {
        const scanState = scanner.getState?.();
        if (scanState === 2 || scanState === 3) {
          await scanner.stop();
        }
        scanner.clear?.();
      }
    } catch {}
    html5QrRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    await stopScanner();

    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("isbn-scanner-region");
    html5QrRef.current = scanner;

    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 280, height: 160 },
      },
      (decodedText: string) => {
        const isbn = decodedText.replace(/[^0-9X]/gi, "");
        if (isbn.length === 13 || isbn.length === 10) {
          scanner.pause(true);
          setState({ step: "loading", isbn });
        }
      },
      () => {},
    ).catch(() => {
      setState({ step: "error", message: "Impossible d'accéder à la caméra. Vérifiez les permissions." });
    });
  }, [stopScanner]);

  useEffect(() => {
    if (state.step === "scanning") {
      startScanner();
    }
    return () => {
      if (state.step === "scanning") {
        stopScanner();
      }
    };
  }, [state.step, startScanner, stopScanner]);

  useEffect(() => {
    if (state.step !== "loading") return;
    let cancelled = false;
    (async () => {
      try {
        const data = await lookupIsbn(state.isbn);
        if (!cancelled) setState({ step: "result", data });
      } catch (e: any) {
        if (!cancelled) setState({ step: "error", message: e.message ?? "Erreur de recherche" });
      }
    })();
    return () => { cancelled = true; };
  }, [state]);

  const reset = useCallback(async () => {
    await stopScanner();
    setState({ step: "scanning" });
  }, [stopScanner]);

  return (
    <div className="space-y-4">
      {state.step === "scanning" && (
        <div className="space-y-3">
          <p className="text-center text-xs text-muted">Pointez la caméra vers le code barre ISBN</p>
          <div
            ref={scannerRef}
            id="isbn-scanner-region"
            className="mx-auto overflow-hidden rounded-lg"
            style={{ maxWidth: 400 }}
          />
        </div>
      )}

      {state.step === "loading" && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted">Recherche du livre…</p>
          <p className="mt-mono mt-1 text-xs text-muted-2">{state.isbn}</p>
        </div>
      )}

      {state.step === "error" && (
        <div className="space-y-3 py-8 text-center">
          <p className="text-sm text-crimson">{state.message}</p>
          <button className="mt-ghost" onClick={reset}>Réessayer</button>
        </div>
      )}

      {state.step === "result" && (
        <ScanResult data={state.data} onDone={reset} />
      )}
    </div>
  );
}
