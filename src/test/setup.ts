import "@testing-library/jest-dom";
import i18n from "@/i18n";

// Nei test forziamo l'italiano: jsdom dichiara "en-US" nel navigator
// e il rilevatore di lingua prenderebbe l'app in inglese.
void i18n.changeLanguage("it");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// P42: jsdom non ha ResizeObserver, usato da @radix-ui/react-use-size (Slider)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;
