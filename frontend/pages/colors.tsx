import AppFooter from '../components/AppFooter'
import AppHeader from '../components/AppHeader'
import AppSidebar from '../components/AppSidebar'

export default function ColorsPage() {
	return (
		<div>
			<AppSidebar />
			<div className="wrapper d-flex flex-column min-vh-100">
				<AppHeader />
				<div className="body flex-grow-1">
					<div className="container py-4">
						<h1 className="mb-3">Colors</h1>
						<p>This is a placeholder page for theme colors. You can customize or remove it later.</p>
					</div>
				</div>
				<AppFooter />
			</div>
		</div>
	)
}

