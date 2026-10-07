import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import AdbIcon from "@mui/icons-material/Adb";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import FeedIcon from "@mui/icons-material/Feed";
import ExploreIcon from "@mui/icons-material/Explore";
import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person";
import { useState } from "react";
import {
  Popover,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import { X } from "lucide-react";
import Message from "../section/Message";

const settings = ["Tên: Nguyễn Ngọc Qúy", "Tài khoản", "Cài đặt", "Đăng xuất"];

function ResponsiveAppBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [chatAnchorEl, setChatAnchorEl] = useState(null);

  const [openChatBoxes, setOpenChatBoxes] = useState([]);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const isChatOpen = Boolean(chatAnchorEl);

  const handleOpenChat = (event) => setChatAnchorEl(event.currentTarget);
  const handleCloseChat = () => setChatAnchorEl(null);

  const handleSelectUserToChat = (user) => {
    handleCloseChat();
    setMobileOpen(false);
    if (!openChatBoxes.some((item) => item.id === user.id)) {
      setOpenChatBoxes((prev) => [...prev, user]);
    }
  };

  const handleCloseChatBox = (userId) => {
    setOpenChatBoxes((prev) =>
      prev.filter((item) => String(item.id) !== String(userId)),
    );
  };

  const pages = [
    { id: "feed", label: "Bảng tin", icon: <FeedIcon />, href: "/" },
    {
      id: "explore",
      label: "Khám phá",
      icon: <ExploreIcon />,
      href: "/explore",
    },
    { id: "chat", label: "Tin nhắn", icon: <ChatIcon /> },
    { id: "profile", label: "Cá nhân", icon: <PersonIcon />, href: "/profile" },
  ];

  return (
    <>
      <AppBar position="fixed">
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: 2 }}>
            {/* Logo Desktop */}
            <AdbIcon sx={{ display: { xs: "none", md: "flex" }, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="/"
              sx={{
                mr: 2,
                display: { xs: "none", md: "flex" },
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".3rem",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              LOGO
            </Typography>

            {/* Nút Hamburger bật Drawer trên Mobile */}
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <IconButton
                size="large"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </Box>

            {/* Logo Mobile */}
            <AdbIcon sx={{ display: { xs: "flex", md: "none" }, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="/"
              sx={{
                mr: 1,
                display: { xs: "flex", md: "none" },
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".1rem",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              LOGO
            </Typography>

            {/* Thanh Search */}
            <Box sx={{ flexGrow: 1, maxWidth: { xs: "100%", md: 450 } }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Tìm kiếm..."
                variant="outlined"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                        />
                      </InputAdornment>
                    ),
                    sx: {
                      color: "white",
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: 2,
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.25)",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        border: "none",
                      },
                    },
                  },
                }}
              />
            </Box>

            {/* Menu điều hướng trên Desktop */}
            <Box
              sx={{
                flexGrow: 1,
                display: { xs: "none", md: "flex" },
                justifyContent: "flex-end",
              }}
            >
              {pages.map((page) => (
                <Box key={page.id} sx={{ position: "relative" }}>
                  <Button
                    href={page.href}
                    onClick={(e) => {
                      if (page.id === "chat") {
                        handleOpenChat(e);
                      }
                    }}
                    sx={{ my: 2, color: "white", display: "flex", gap: 1 }}
                  >
                    {page.icon}
                  </Button>

                  {page.id === "chat" && (
                    <Popover
                      open={isChatOpen}
                      anchorEl={chatAnchorEl}
                      onClose={handleCloseChat}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "right",
                      }}
                      PaperProps={{
                        sx: {
                          width: 320,
                          maxHeight: 400,
                          borderRadius: 2,
                          boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
                          mt: 1,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          px: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          bgcolor: "#f8fafc",
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={700}>
                          Tin nhắn gần đây
                        </Typography>
                        <Typography
                          variant="caption"
                          color="primary"
                          sx={{
                            cursor: "pointer",
                            fontWeight: 600,
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          Xem tất cả
                        </Typography>
                      </Box>

                      <Box sx={{ overflowY: "auto", maxHeight: 320 }}>
                        {[
                          {
                            id: 1,
                            name: "Nguyễn Mai Anh",
                            avatar:
                              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
                            text: "File báo cáo tuần này xong chưa gửi mình xem với!",
                            time: "10:30",
                            unread: true,
                          },
                          {
                            id: 2,
                            name: "Trần Hoàng Long",
                            avatar:
                              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
                            text: "Anh xem lại phần UI mới cập nhật nhé.",
                            time: "09:15",
                            unread: false,
                          },
                          {
                            id: 3,
                            name: "Lê Minh Tuấn",
                            avatar:
                              "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100",
                            text: "Đã deploy server thành công rồi sếp.",
                            time: "Hôm qua",
                            unread: false,
                          },
                        ].map((item) => (
                          <Box
                            key={item.id}
                            onClick={() => handleSelectUserToChat(item)}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              p: 1.5,
                              px: 2,
                              cursor: "pointer",
                              bgcolor: item.unread
                                ? "rgba(59, 130, 246, 0.05)"
                                : "transparent",
                              transition: "background-color 0.2s",
                              "&:hover": { bgcolor: "action.hover" },
                              borderBottom: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Avatar
                              src={item.avatar}
                              sx={{ width: 40, height: 40 }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  mb: 0.5,
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  noWrap
                                  fontWeight={item.unread ? 700 : 500}
                                >
                                  {item.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.7rem" }}
                                >
                                  {item.time}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                color={
                                  item.unread
                                    ? "text.primary"
                                    : "text.secondary"
                                }
                                fontWeight={item.unread ? 600 : 400}
                                noWrap
                                sx={{ fontSize: "0.8rem" }}
                              >
                                {item.text}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Popover>
                  )}
                </Box>
              ))}
            </Box>

            {/* Avatar User */}
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Mở cài đặt">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar
                    alt="Nguyễn Ngọc Quý"
                    src="/static/images/avatar/2.jpg"
                  />
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: "45px" }}
                id="menu-appbar-user"
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                keepMounted
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                {settings.map((setting) => (
                  <MenuItem key={setting} onClick={handleCloseUserMenu}>
                    <Typography sx={{ textAlign: "center" }}>
                      {setting}
                    </Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 260,
            zIndex: 999,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            bgcolor: "primary.main",
            color: "white",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AdbIcon />
            <Typography variant="h6" fontWeight={700}>
              MENU
            </Typography>
          </Box>
          <IconButton onClick={handleDrawerToggle} sx={{ color: "white" }}>
            <X size={20} />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {pages.map((page) => (
            <ListItem key={page.id} disablePadding>
              <ListItemButton
                onClick={(e) => {
                  handleDrawerToggle();

                  if (page.id === "chat") {
                    handleOpenChat(e);
                  }
                }}
              >
                <ListItemIcon>{page.icon}</ListItemIcon>
                <ListItemText primary={page.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          right: { xs: 16, sm: "10%" },
          display: "flex",
          flexDirection: "row-reverse",
          alignItems: "flex-end",
          gap: 2,
          zIndex: 1300,
        }}
      >
        {openChatBoxes.map((user) => (
          <Message
            key={user.id}
            friend={user}
            onClose={() => handleCloseChatBox(user.id)}
          />
        ))}
      </Box>
    </>
  );
}

export default ResponsiveAppBar;
