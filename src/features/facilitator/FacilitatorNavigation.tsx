import AccountTreeIcon from "@mui/icons-material/AccountTree";
import GroupsIcon from "@mui/icons-material/Groups";
import KeyIcon from "@mui/icons-material/Key";
import MenuIcon from "@mui/icons-material/Menu";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import SecurityIcon from "@mui/icons-material/Security";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useMediaQuery, useTheme } from "@mui/material";

export type FacilitatorSection =
  | "ACCESS"
  | "PERSONAL_ACCESS"
  | "PARTICIPANTS"
  | "RECOVERY"
  | "STAGE";

interface FacilitatorNavigationProps {
  readonly selected: FacilitatorSection;
  readonly onSelect: (section: FacilitatorSection) => void;
  readonly hasPersonalAccess: boolean;
  readonly hasRecovery: boolean;
}

const items = [
  { id: "ACCESS", label: "Acceso", icon: <QrCode2Icon /> },
  { id: "PERSONAL_ACCESS", label: "Accesos personales", icon: <KeyIcon /> },
  { id: "PARTICIPANTS", label: "Participantes", icon: <GroupsIcon /> },
  { id: "RECOVERY", label: "Recuperación", icon: <SecurityIcon /> },
  { id: "STAGE", label: "Control de etapa", icon: <AccountTreeIcon /> },
] as const;

export function FacilitatorNavigation({
  selected,
  onSelect,
  hasPersonalAccess,
  hasRecovery,
}: FacilitatorNavigationProps) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(!mobile);

  const content = (
    <Box sx={{ width: open || mobile ? 260 : 67, p: 1}}>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, px: 0.5, py: 0.5 }}
      >
        <IconButton
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Contraer secciones" : "Mostrar secciones"}
        >
          <MenuIcon />
        </IconButton>
        {open || mobile ? (
          <Typography sx={{ fontWeight: 700 }}>Secciones</Typography>
        ) : null}
      </Box>
      <List aria-label="Secciones del panel del facilitador">
        {items.map((item) => {
          const disabled =
            (item.id === "PERSONAL_ACCESS" && !hasPersonalAccess) ||
            (item.id === "RECOVERY" && !hasRecovery);
          return (
            <Tooltip
              key={item.id}
              title={open || mobile ? "" : item.label}
              placement="right"
            >
              <span>
                <ListItemButton
                  selected={selected === item.id}
                  disabled={disabled}
                  onClick={() => {
                    onSelect(item.id);
                    if (mobile) setOpen(false);
                  }}
                  sx={{ minHeight: 48, borderRadius: 2, px: 1.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 29,mr: 1 }}>{item.icon}</ListItemIcon>
                  {open || mobile ? (
                    <ListItemText primary={item.label} />
                  ) : null}
                </ListItemButton>
              </span>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );

  if (mobile) {
    return (
      <>
        <Tooltip title="Abrir secciones">
          <IconButton
            onClick={() => setOpen(true)}
            aria-label="Abrir secciones del panel"
            sx={{ alignSelf: "flex-start", bgcolor: "background.paper" }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              sx: {
                // bgcolor: "rgb(255, 250, 250)",
                // backdropFilter: "blur(16px)",
                // border: "1px solid rgba(255,255,255,1)",
              },
            },
          }}
        >
          {content}
        </Drawer>
      </>
    );
  }

  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          position: "relative",
          borderRadius: 3,
          bgcolor: "rgb(255, 250, 250)",
          border: "1px solid rgba(255,255,255,1)",
          // backdropFilter: "blur(16px)",
          // height: "100%",
          boxShadow: "0 4px 30px rgb(0, 0, 0)",
        },
      }}
    >
      {content}
    </Drawer>
  );
}
