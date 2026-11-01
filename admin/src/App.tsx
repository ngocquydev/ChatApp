import { Routes, Route, Navigate } from "react-router-dom";
import { routes } from "./routes/routes";

export default function App() {
  return (
    <Routes>
      {routes.map((route, idx) => (
        <Route key={route.path || idx} path={route.path} element={route.element}>
          {route.children?.map((child, childIdx) =>
            child.index ? (
              <Route key="index" index element={child.element} />
            ) : (
              <Route
                key={child.path || childIdx}
                path={child.path}
                element={child.element}
              />
            )
          )}
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
