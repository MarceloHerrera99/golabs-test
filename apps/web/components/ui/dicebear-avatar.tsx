"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo } from "react";
import { createAvatar, type Style } from "@dicebear/core";
import * as collection from "@dicebear/collection";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const AVATAR_STYLES = {
  adventurer: collection.adventurer,
  adventurerNeutral: collection.adventurerNeutral,
  avataaars: collection.avataaars,
  avataaarsNeutral: collection.avataaarsNeutral,
  bigEars: collection.bigEars,
  bigEarsNeutral: collection.bigEarsNeutral,
  bigSmile: collection.bigSmile,
  bottts: collection.bottts,
  botttsNeutral: collection.botttsNeutral,
  croodles: collection.croodles,
  croodlesNeutral: collection.croodlesNeutral,
  dylan: collection.dylan,
  funEmoji: collection.funEmoji,
  glass: collection.glass,
  icons: collection.icons,
  identicon: collection.identicon,
  initials: collection.initials,
  lorelei: collection.lorelei,
  loreleiNeutral: collection.loreleiNeutral,
  micah: collection.micah,
  miniavs: collection.miniavs,
  notionists: collection.notionists,
  notionistsNeutral: collection.notionistsNeutral,
  openPeeps: collection.openPeeps,
  personas: collection.personas,
  pixelArt: collection.pixelArt,
  pixelArtNeutral: collection.pixelArtNeutral,
  rings: collection.rings,
  shapes: collection.shapes,
  thumbs: collection.thumbs,
  toonHead: collection.toonHead,
} as const;

export type AvatarStyleKey = keyof typeof AVATAR_STYLES;

interface DicebearAvatarProps {
  seed: string;
  size?: number;
  className?: string;
  badgeClassName?: string;
  imageURL?: string;
  badgeImageURL?: string;
  style?: string;
}

export const DicebearAvatar = ({
  seed,
  size = 32,
  className,
  badgeClassName,
  imageURL,
  badgeImageURL,
  style = "micah",
}: DicebearAvatarProps) => {
  const avatarSrc = useMemo(() => {
    if (imageURL) {
      return imageURL;
    }

    const avatarStyle = (AVATAR_STYLES[style as AvatarStyleKey] ??
      AVATAR_STYLES.micah) as // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Style<any>;

    const avatar = createAvatar(avatarStyle, {
      seed: seed.toLowerCase().trim(),
      size: size,
    });
    return avatar.toDataUri();
  }, [seed, size, imageURL, style]);

  const badgeSize = Math.round(size * 0.5);

  return (
    <div
      className="relative inline-block"
      style={{
        width: size,
        height: size,
      }}
    >
      <Avatar
        className={cn("border", className)}
        style={{
          width: size,
          height: size,
        }}
      >
        <AvatarImage alt="Image" src={avatarSrc} />
      </Avatar>
      {badgeImageURL && (
        <div
          className={cn(
            "absolute bottom-0 right-0 rounded-full flex items-center justify-center overflow-hidden border-2 border-background bg-background",
            badgeClassName,
          )}
          style={{
            width: badgeSize,
            height: badgeSize,
            transform: "translate(15%, 15%)",
          }}
        >
          <img
            src={badgeImageURL}
            alt="Badge"
            className="w-full h-full rounded-full object-cover"
            height={badgeSize}
            width={badgeSize}
          />
        </div>
      )}
    </div>
  );
};
