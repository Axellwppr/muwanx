import React, { useEffect, useRef } from 'react';
import { MuwanxRuntime } from '../core/engine/runtime';

type MuwanxViewerProps = {
  scenePath: string;
  baseUrl: string;
  onStatusChange?: (status: string) => void;
  onError?: (error: Error) => void;
};

const MuwanxViewer: React.FC<MuwanxViewerProps> = ({
  scenePath,
  baseUrl,
  onStatusChange,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<MuwanxRuntime | null>(null);
  const mujocoRef = useRef<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const notify = (status: string) => {
      onStatusChange?.(status);
    };

    const init = async () => {
      notify('Loading MuJoCo...');
      if (!mujocoRef.current) {
        const mujocoModule = await import('mujoco-js');
        mujocoRef.current = await mujocoModule.default();
      }
      if (cancelled) {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        throw new Error('Failed to find viewer container.');
      }

      if (!runtimeRef.current) {
        runtimeRef.current = new MuwanxRuntime(mujocoRef.current, container, { baseUrl });
      }

      notify('Loading scene assets...');
      await runtimeRef.current.loadEnvironment(scenePath);
      if (cancelled) {
        return;
      }
      notify('Running simulation');
    };

    init().catch(error => {
      if (!cancelled) {
        console.error('Failed to initialize MuJoCo viewer:', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
        notify('Failed to load scene');
      }
    });

    return () => {
      cancelled = true;
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, [scenePath, baseUrl, onStatusChange, onError]);

  return <div ref={containerRef} className="viewer" />;
};

export default MuwanxViewer;
