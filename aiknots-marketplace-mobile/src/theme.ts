export const colors = {
  // brand (live site theme-color #00927c)
  primary: "#00927c",
  primaryDark: "#006f5e",
  primarySoft: "#E3F4F1",
  pine: "#0F2F2A",
  saffron: "#F5A524",
  saffronSoft: "#FFF3DC",
  paper: "#F5F8F7",
  card: "#FFFFFF",
  text: "#14231F",
  muted: "#5C6F6A",
  faint: "#98A8A3",
  border: "#E2EAE8",
  success: "#2E8B57",
  alert: "#D64545",
  alertSoft: "#FDECEC",
  info: "#3B6FA0",
};

export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = {
  card: {
    shadowColor: "#0F2F2A",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  float: {
    shadowColor: "#0F2F2A",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export const font = {
  regular: { fontWeight: "400" as const },
  medium: { fontWeight: "500" as const },
  semi: { fontWeight: "600" as const },
  bold: { fontWeight: "700" as const },
  black: { fontWeight: "800" as const },
};
