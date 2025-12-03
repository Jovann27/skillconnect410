import { useNavigate } from "react-router-dom";
import { useMainContext } from "../mainContext";

const useNavigateWithLoader = () => {
  const navigate = useNavigate();
  const { setNavigationLoading } = useMainContext();

  const navigateWithLoader = (to, options = {}) => {
    setNavigationLoading(true);
    setTimeout(() => {
      navigate(to, options);
      setNavigationLoading(false);
    }, 100); // Short delay to show loader
  };

  return navigateWithLoader;
};

export default useNavigateWithLoader;
