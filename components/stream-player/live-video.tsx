import React, { useEffect, useRef, useState } from "react";
import { Participant, Track } from "livekit-client";
import { useTracks } from "@livekit/components-react";

import { FullscreenControl } from "./fullscreen-control";
import { VolumeControl } from "./volume-control";

export function LiveVideo({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(0);

  /* ---------------- Volume ---------------- */

  const onVolumeChange = (value: number) => {
    setVolume(value);

    if (!videoRef.current) return;

    videoRef.current.muted = value === 0;
    videoRef.current.volume = value * 0.01;
  };

  const toggleMute = () => {
    const isMuted = volume === 0;
    const newVolume = isMuted ? 50 : 0;

    setVolume(newVolume);

    if (!videoRef.current) return;

    videoRef.current.muted = !isMuted;
    videoRef.current.volume = isMuted ? 0.5 : 0;
  };

  useEffect(() => {
    onVolumeChange(0);
  }, []);

  /* ---------------- Fullscreen ---------------- */

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (wrapperRef.current) {
      wrapperRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  /* ---------------- LiveKit Tracks ---------------- */

  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.Microphone,
  ]).filter(
    (track) => track.participant.identity === participant.identity
  );

  useEffect(() => {
    if (!videoRef.current) return;

    tracks.forEach((track) => {
      track.publication.track?.attach(videoRef.current!);
    });

    return () => {
      tracks.forEach((track) => {
        track.publication.track?.detach(videoRef.current!);
      });
    };
  }, [tracks]);

  /* ---------------- UI ---------------- */

  return (
    <div ref={wrapperRef} className="relative h-full flex bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 flex h-14 w-full items-center justify-between bg-gradient-to-r from-neutral-900/80 px-4">
          <VolumeControl
            value={volume}
            onChange={onVolumeChange}
            onToggle={toggleMute}
          />
          <FullscreenControl
            isFullscreen={isFullscreen}
            onToggle={toggleFullscreen}
          />
        </div>
      </div>
    </div>
  );
}
