import { LottieLight } from "lottie-react";
import animationData from "@/assets/animation/LivroAnimacao.json";

export default function HeroAnimation() {
  return <LottieLight src={animationData} autoplay loop aria-hidden="true" />;
}
