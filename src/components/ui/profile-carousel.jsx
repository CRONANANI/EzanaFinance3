"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Profile item: name, designation (subtitle), description, profileImage
export function ProfileCarousel({ items, variant = "default", initialScroll = 0, onInvestorCardOpen }) {
  const carouselRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  const handleScrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const handleCardClose = (index) => {
    if (carouselRef.current) {
      const isInvestor = variant === "investor";
      const cardWidth = isInvestor ? 200 : (typeof window !== "undefined" && window.innerWidth < 768 ? 230 : 384);
      const gap = isInvestor ? 12 : (typeof window !== "undefined" && window.innerWidth < 768 ? 4 : 8);
      const scrollPosition = (cardWidth + gap) * (index + 1);
      carouselRef.current.scrollTo({ left: scrollPosition, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  return (
    <div className="relative w-full min-w-0 max-w-full overflow-hidden mt-6">
      <div
        className="profile-carousel-scroll flex w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain scroll-smooth py-5"
        ref={carouselRef}
        onScroll={checkScrollability}
      >
        <div className="flex flex-row justify-start gap-4 pl-3">
          {items.map((item, index) => (
            <motion.div
              key={`card-${item.name}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, delay: 0.1 * index, ease: "easeOut", once: true },
              }}
              className="last:pr-8 rounded-2xl shrink-0"
            >
              <ProfileCard
                profile={item}
                index={index}
                variant={variant}
                onCardClose={() => handleCardClose(index)}
                onOpen={variant === "investor" ? onInvestorCardOpen : undefined}
                dataTaskTarget={variant === "investor" && index === 0 ? "legendary-investor-card" : undefined}
              />
            </motion.div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          className="h-10 w-10 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center disabled:opacity-40 hover:bg-[#10b981]/30 transition-colors duration-200"
          onClick={handleScrollLeft}
          disabled={!canScrollLeft}
          type="button"
        >
          <ArrowLeft className="h-5 w-5 text-[#10b981]" />
        </button>
        <button
          className="h-10 w-10 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center disabled:opacity-40 hover:bg-[#10b981]/30 transition-colors duration-200"
          onClick={handleScrollRight}
          disabled={!canScrollRight}
          type="button"
        >
          <ArrowRight className="h-5 w-5 text-[#10b981]" />
        </button>
      </div>
    </div>
  );
}

function useOutsideClick(ref, onOutsideClick) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      onOutsideClick();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [ref, onOutsideClick]);
}

function ProfileCard({ profile, index, variant = "default", onCardClose = () => {}, onOpen, dataTaskTarget }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

  const handleExpand = () => {
    onOpen?.();
    setIsExpanded(true);
  };
  const handleCollapse = () => {
    setIsExpanded(false);
    onCardClose();
  };

  useOutsideClick(containerRef, handleCollapse);

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape") handleCollapse();
    };
    if (isExpanded) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.dataset.scrollY = String(scrollY);
    } else {
      const scrollY = parseInt(document.body.dataset.scrollY || "0", 10);
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo({ top: scrollY, behavior: "instant" });
    }
    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [isExpanded]);

  const cardBg = variant === "firm"
    ? "from-[#1a2332] to-[#0f1419]"
    : "from-[#1a2332] to-[#0f1419]";

  const expandedBg = variant === "firm"
    ? "from-[#1a2332] to-[#0f1419]"
    : "from-[#1a2332] to-[#0f1419]";

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 h-screen overflow-hidden z-[9999]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-black/80 backdrop-blur-md h-full w-full fixed inset-0"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              className={cn(
                "max-w-3xl mx-auto bg-gradient-to-b border border-[#10b981]/20 h-full z-[10000] p-6 md:p-10 rounded-2xl relative mt-10 overflow-y-auto",
                expandedBg
              )}
            >
              <button
                className="sticky top-4 h-10 w-10 right-0 ml-auto rounded-full flex items-center justify-center bg-[#10b981]/20 border border-[#10b981]/40 hover:bg-[#10b981]/30"
                onClick={handleCollapse}
                type="button"
              >
                <X className="h-5 w-5 text-[#10b981]" />
              </button>
              <p className="text-[#10b981] text-sm font-medium uppercase tracking-wider mt-2">
                {profile.designation}
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-white mt-2">
                {profile.name}
              </h3>
              <div className="py-6 text-[#9ca3af] text-lg leading-relaxed">
                <Quote className="h-6 w-6 text-[#10b981]/60 mb-2" />
                {profile.description}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleExpand}
        type="button"
        className="text-left w-full"
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        data-task-target={dataTaskTarget}
      >
        <div
          className={cn(
            "rounded-2xl bg-gradient-to-b overflow-hidden flex flex-col items-center relative z-10 border border-[#10b981]/10",
            variant === "investor"
              ? "legendary-investor-card min-h-[200px] w-[240px] min-w-[220px] max-w-[240px] shrink-0 justify-start pt-0"
              : "h-[420px] w-72 md:h-[480px] md:w-80 justify-center",
            cardBg
          )}
        >
          {variant !== "investor" && (
            <div className="absolute inset-0 opacity-20 investor-card-bg">
              <Image
                src={profile.backgroundImage || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800"}
                alt=""
                fill
                className="object-cover"
                sizes="320px"
              />
            </div>
          )}
          {variant === "investor" && (
            <div className="investor-card-header w-full h-[70px] min-h-[70px] shrink-0 bg-gradient-to-br from-[#0f1419] to-[#111a16]" />
          )}
          <ProfileImage src={profile.profileImage} alt={profile.name} variant={variant} />
          <p
            className={cn(
              "text-[#9ca3af] text-center",
              variant === "investor"
                ? "investor-bio text-[0.5625rem] mt-2 line-clamp-3 px-2 leading-relaxed"
                : "text-sm mt-4 line-clamp-3 px-4"
            )}
          >
            {profile.description.length > 120 ? `${profile.description.slice(0, 120)}...` : profile.description}
          </p>
          <p className={cn("text-white text-center font-semibold", variant === "investor" ? "investor-name text-[0.75rem] mt-1 font-extrabold" : "text-xl mt-4")}>
            {profile.name}
          </p>
          <p className={cn("text-[#10b981] font-medium text-center", variant === "investor" ? "investor-designation text-[0.625rem] mt-0.5 pb-2 font-semibold break-words" : "text-sm mt-1")}>
            {profile.designation}
          </p>
        </div>
      </motion.button>
    </>
  );
}

function ProfileImage({ src, alt, variant }) {
  const [isLoading, setLoading] = useState(true);
  const isInvestor = variant === "investor";
  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden border-2 border-[#10b981]/40 flex-shrink-0 z-10 investor-avatar-wrap",
        isInvestor ? "w-12 h-12 min-w-12 min-h-12 mt-[-24px]" : "w-24 h-24 md:w-32 md:h-32 mt-6"
      )}
    >
      <Image
        className={cn("object-cover transition duration-300", isLoading ? "blur-sm" : "blur-0")}
        onLoad={() => setLoading(false)}
        src={src}
        fill
        sizes="128px"
        alt={alt || "Profile"}
      />
    </div>
  );
}
