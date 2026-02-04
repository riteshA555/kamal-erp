import { lazy, ComponentType, LazyExoticComponent } from 'react';

export type PreloadableComponent<T extends ComponentType<any>> = LazyExoticComponent<T> & {
    preload: () => Promise<{ default: T }>;
};

export const lazyWithPreload = <T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
): PreloadableComponent<T> => {
    const Component = lazy(factory) as PreloadableComponent<T>;
    Component.preload = factory;
    return Component;
};
