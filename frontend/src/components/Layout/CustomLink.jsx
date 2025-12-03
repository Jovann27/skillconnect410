import { Link, useNavigate } from "react-router-dom";
import { useMainContext } from "../../mainContext";

const CustomLink = ({ to, children, ...props }) => {
  const navigate = useNavigate();
  const { setNavigationLoading } = useMainContext();

  const handleClick = (e) => {
    e.preventDefault();

    // Show loader
    setNavigationLoading(true);

    // Navigate after a short delay to show loader
    setTimeout(() => {
      navigate(to, props);
      setNavigationLoading(false);
    }, 100); // Short delay to ensure loader shows
  };

  return (
    <Link to={to} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
};

export default CustomLink;
