import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

export interface BannerItem {
  id: string;
  imageUrl: string;
  redirectRoute: string;
  sliderDuration?: number | null;
}

export function BannerCarousel({
  banners,
  onPress,
}: {
  banners: BannerItem[];
  onPress?: (banner: BannerItem) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(index => Math.min(index, Math.max(0, banners.length - 1)));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length < 2 || !pageWidth) return;
    const timer = setTimeout(() => {
      setActiveIndex(current => {
        const next = (current + 1) % banners.length;
        scrollRef.current?.scrollTo({
          x: next * pageWidth,
          animated: true,
        });
        return next;
      });
    }, Math.max(1, banners[activeIndex]?.sliderDuration ?? 5) * 1000);
    return () => clearTimeout(timer);
  }, [activeIndex, banners, pageWidth]);

  if (!banners.length) return null;

  return (
    <View
      style={styles.wrapper}
      onLayout={event => setPageWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={event => {
          if (!pageWidth) return;
          setActiveIndex(
            Math.round(event.nativeEvent.contentOffset.x / pageWidth),
          );
        }}
      >
        {banners.map(banner => {
          const content = (
            <View style={styles.card}>
              <Image
                source={{ uri: banner.imageUrl }}
                style={styles.image}
                resizeMode="cover"
                accessibilityLabel="Dashboard banner"
              />
            </View>
          );

          return (
            <View
              key={banner.id}
              style={[styles.page, { width: pageWidth || '100%' }]}
            >
              {onPress ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open dashboard banner"
                  onPress={() => onPress(banner)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  {content}
                </Pressable>
              ) : (
                content
              )}
            </View>
          );
        })}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={styles.dots} accessibilityLabel="Banner pages">
          {banners.map((banner, index) => (
            <View
              key={banner.id}
              style={[styles.dot, index === activeIndex && styles.activeDot]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', gap: 8 },
  page: { paddingHorizontal: 1 },
  card: {
    height: 158,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8EFEC',
  },
  image: { width: '100%', height: '100%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C8D4D0' },
  activeDot: { width: 18, backgroundColor: '#087451' },
  pressed: { opacity: 0.82 },
});
