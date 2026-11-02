# AI Knots Marketplace — React Native (Expo + TypeScript)

Web app (React 18 + MUI + Redux) ka **Customer** side React Native me convert kiya gaya hai.
Folder structure aapke `School-Management-Software` project jaisa hai.

```
App.tsx · index.ts · app.json · eas.json · tsconfig.json
scripts/            build-android-short.ps1
src/
  theme.ts  types.ts
  components/       UI, AnimatedPressable, Skeleton, ProductCard, BannerCarousel, HeartButton,
                    QuantityStepper, TabIcon, AuthLayout
  context/          Auth, Cart, Wishlist, Toast
  lib/              api.ts, mock.ts, data.ts, format.ts, storage.ts, layout.ts, useAsync.ts
  screens/          Home, Categories, Products, ProductDetail, Cart, Wishlist, Checkout, Addresses,
                    Orders, OrderDetail, OrderSuccess, Profile, Notifications, AIChat,
                    Login, Register(OTP), ForgotPassword
```

## Run

```bash
npm install
cp .env.example .env
npx expo start
```

- `EXPO_PUBLIC_API_URL` khali ho (ya `EXPO_PUBLIC_USE_MOCK=1`) to **demo data** se app chalti hai — backend ke bina.
- Backend ke saath chalane ke liye `../ecommerce-nest-microservices` me `docker compose up --build` chalao; gateway `http://localhost:8080/api` par milega.
- `.env` me `EXPO_PUBLIC_API_URL` ko `http://<computer-ka-LAN-IP>:8080/api` set karo (Expo Go par `localhost` phone ko refer karta hai), aur `EXPO_PUBLIC_USE_MOCK=0` rakho.
- Backend me abhi OTP/password reset, notifications, AI chat aur real online payment checkout available nahi hain. Checkout ke liye Cash on Delivery available hai.
- Android/iOS native folders chahiye to: `npx expo prebuild` ya `eas build -p android --profile preview`.

## Backend se jodna

Mobile API `../ecommerce-nest-microservices` ke NestJS gateway (`/api`) ke auth, catalog, cart,
wishlist, address, coupon, and order routes ke saath wired hai. Request paths and response
normalization `src/lib/api.ts` me hain.

## Web → React Native mapping

| Web | Mobile |
|---|---|
| React Router | React Navigation (native stack + bottom tabs) |
| MUI + Tailwind | StyleSheet + `src/theme.ts` |
| localStorage JWT | expo-secure-store (Keychain / Keystore) |
| HttpOnly refresh cookie | refresh token body me, secure-store me |
| Redux Toolkit slices | Context + hooks (Auth, Cart, Wishlist) |
| React Slick | `BannerCarousel` (Reanimated, parallax + auto-play) |
| Formik + Yup | inline validation |

## Animations (react-native-reanimated 4)

Press-spring on every button/card · staggered list entrance · animated tab icons + cart badge pop ·
wishlist heart pop · skeleton shimmer · auto-play banner with parallax · product-detail hero parallax
and overscroll zoom · swipe-to-delete cart rows with layout animation · free-delivery progress bar ·
bottom-sheet filters · animated focus borders · AI-chat typing dots · order timeline fill ·
order-success check drawing.

## Abhi include nahi hai (next phases)

Seller panel, Admin panel, Socket.IO live notifications, native Razorpay/Stripe SDK
(abhi payment gateway ka hosted link browser me khulta hai), invoice PDF download, cookie banner (mobile par zaroori nahi).
