"use client";

import Logo3DScene from "./Logo3DScene";

export default function InteractiveStudioScene() {
  return (
    <Logo3DScene
      large
      showFooter={false}
      className="!min-h-0 mx-auto aspect-square h-auto w-full max-w-[340px]"
    />
  );
}
